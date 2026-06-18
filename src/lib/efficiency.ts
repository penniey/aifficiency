import type {
  AppConfig,
  BenchmarkKey,
  Benchmarks,
  Ceiling,
  LensConfig,
  LensKey,
  LensScore,
  Model,
  ModelPricing,
  RankedModel,
} from "./types";

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export type CostOptions = {
  promptShare: number; // 0-1, fraction of workload that is prompt tokens
  useCacheSavings: boolean; // subtract input_cache_read savings from prompt cost
  costEpsilon: number; // $/1M used for free models so log-scale maths stay finite
};

export function computeBlendedCost(
  pricing: ModelPricing | undefined,
  isFree: boolean,
  opts: CostOptions
): number {
  if (!pricing) return opts.costEpsilon;
  if (isFree) return opts.costEpsilon;
  const prompt = Math.max(0, pricing.prompt);
  const completion = Math.max(0, pricing.completion);
  const share = clamp(opts.promptShare, 0, 1);
  let blended = prompt * share + completion * (1 - share);
  if (opts.useCacheSavings && typeof pricing.inputCacheRead === "number") {
    // Assume the prompt share of the workload reuses cached context at the
    // cache-read rate; the blended prompt price becomes a mix of fresh and
    // cached prompt tokens. 50% cache hit is a reasonable coding default.
    const cacheHit = 0.5;
    const effPrompt = prompt * (1 - cacheHit) + Math.max(0, pricing.inputCacheRead) * cacheHit;
    blended = effPrompt * share + completion * (1 - share);
  }
  return Number(blended.toFixed(6));
}

// ---------------------------------------------------------------------------
// Benchmark normalization (fixed ceilings, not raw max, so cross-benchmark
// scales are comparable and a model's score is stable as new models arrive)
// ---------------------------------------------------------------------------

export function normalizeBenchmark(value: number, ceiling: Ceiling): number {
  if (typeof ceiling === "number") {
    return clamp((value / ceiling) * 100, 0, 100);
  }
  const { eloMin, eloMax } = ceiling;
  return clamp(((value - eloMin) / (eloMax - eloMin)) * 100, 0, 100);
}

export function normalizeAll(
  benchmarks: Benchmarks,
  config: AppConfig
): Benchmarks {
  const out: Benchmarks = {};
  for (const key of Object.keys(benchmarks) as BenchmarkKey[]) {
    const raw = benchmarks[key];
    const ceiling = config.ceilings[key];
    if (typeof raw === "number" && ceiling) {
      out[key] = Number(normalizeBenchmark(raw, ceiling).toFixed(2));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-lens capability (cost-independent)
// ---------------------------------------------------------------------------

export type LensCapability = {
  rawCapability: number; // 0-100, weighted avg of present normalized benchmarks
  capability: number; // 0-100, coverage-penalized
  coverage: number; // 0-1, fraction of lens benchmarks present
  presentCount: number;
};

export function computeLensCapability(
  benchmarks: Benchmarks,
  normalized: Benchmarks,
  lens: LensConfig,
  coverageMin: number
): LensCapability {
  let weightedSum = 0;
  let weightSum = 0;
  let presentCount = 0;
  const keys = Object.keys(lens.weights) as BenchmarkKey[];
  for (const key of keys) {
    const w = lens.weights[key];
    if (typeof w !== "number" || w <= 0) continue;
    const norm = normalized[key];
    if (typeof norm === "number") {
      weightedSum += norm * w;
      weightSum += w;
      presentCount++;
    }
  }
  const rawCapability = weightSum > 0 ? weightedSum / weightSum : 0;
  const coverage = keys.length > 0 ? presentCount / keys.length : 0;
  const factor = coverageFactor(presentCount, coverageMin);
  const capability = rawCapability * factor;
  return {
    rawCapability: Number(rawCapability.toFixed(2)),
    capability: Number(capability.toFixed(2)),
    coverage: Number(coverage.toFixed(2)),
    presentCount,
  };
}

// Shrink capability when too few of the lens's benchmarks are present, so a
// one-benchmark fluke can't top the chart. With coverageMin=2: 1 benchmark
// -> 0.75x, 2+ -> 1.0x.
export function coverageFactor(presentCount: number, coverageMin: number): number {
  if (presentCount >= coverageMin) return 1;
  if (presentCount === 0) return 0;
  return 0.5 + 0.5 * (presentCount / coverageMin);
}

// ---------------------------------------------------------------------------
// Efficiency (capability per log-dollar) and the Pareto frontier
// ---------------------------------------------------------------------------

// efficiency = capability / log10(cost_in_dollars_per_M * 1000 + 10).
// The "+10" keeps free/epsilon-cost models finite (log10(10)=1) so a free
// model with capability C scores ~C, not infinity. The "x1000" spreads the
// log scale across the realistic $0.001-$50/M range.
export function computeEfficiency(capability: number, cost: number): number {
  const denom = Math.log10(Math.max(0, cost) * 1000 + 10);
  if (denom <= 0) return 0;
  return Number((capability / denom).toFixed(4));
}

export type FrontierPoint = { id: string; cost: number; capability: number };

export type FrontierResult = {
  optimal: Set<string>;
  distance: Map<string, number>;
};

// Non-dominated frontier: a model is on the frontier if no other model has
// >= capability at <= cost (with at least one strict improvement). For each
// dominated model, frontierDistance is how many capability points it sits
// below the cheapest frontier model that still beats its capability — i.e.
// "how much more intelligence you could get for <= your money".
export function computeFrontier(points: FrontierPoint[]): FrontierResult {
  const sorted = [...points].sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    return b.capability - a.capability;
  });
  const optimal = new Set<string>();
  let runningMax = -Infinity;
  // Walk cheapest -> priciest; a point is non-dominated if it strictly
  // raises the capability bar above everything cheaper.
  for (const p of sorted) {
    if (p.capability > runningMax) {
      optimal.add(p.id);
      runningMax = p.capability;
    }
  }
  const distance = new Map<string, number>();
  // For each dominated point, find the cheapest frontier point with cost <=
  // its cost and capability > its capability; the gap is the shortfall.
  const frontierAsc = [...optimal]
    .map((id) => sorted.find((p) => p.id === id)!)
    .sort((a, b) => a.cost - b.cost);
  for (const p of points) {
    if (optimal.has(p.id)) {
      distance.set(p.id, 0);
      continue;
    }
    let best = 0;
    for (const f of frontierAsc) {
      if (f.cost <= p.cost + 1e-9 && f.capability > p.capability) {
        best = Math.max(best, f.capability - p.capability);
      }
    }
    distance.set(p.id, Number(best.toFixed(2)));
  }
  return { optimal, distance };
}

// ---------------------------------------------------------------------------
// Full scoring (server) + client recompute of cost-dependent fields
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function defaultCostOptions(config: AppConfig): CostOptions {
  return {
    promptShare: config.scoring.promptShare,
    useCacheSavings: config.scoring.useCacheSavings,
    costEpsilon: config.scoring.costEpsilon,
  };
}

// Scores every model for every lens. capability/coverage are cost-independent;
// efficiency/paretoOptimal/frontierDistance/rank use the default cost options
// and are recomputed on the client when the user moves the cost sliders.
export function scoreModels(models: Model[], config: AppConfig): RankedModel[] {
  const costOpts = defaultCostOptions(config);

  const base = models.map((m) => {
    const normalized = normalizeAll(m.benchmarks, config);
    const blendedCost = computeBlendedCost(m.pricing, m.isFree, costOpts);
    const lenses: Record<LensKey, LensScore> = {} as Record<LensKey, LensScore>;
    for (const lens of config.lenses) {
      const cap = computeLensCapability(
        m.benchmarks,
        normalized,
        lens,
        config.scoring.coverageMin
      );
      lenses[lens.key] = {
        capability: cap.capability,
        rawCapability: cap.rawCapability,
        coverage: cap.coverage,
        presentCount: cap.presentCount,
        efficiency: 0,
        paretoOptimal: false,
        frontierDistance: 0,
        rank: 0,
      };
    }
    return {
      ...m,
      normalizedBenchmarks: normalized,
      blendedCost,
      costPerMillion: blendedCost,
      lenses,
    } as RankedModel;
  });

  // Fill cost-dependent fields per lens.
  for (const lens of config.lenses) {
    fillCostDependent(base, lens.key);
  }
  return base;
}

// Recompute blended cost + the cost-dependent lens fields (efficiency, pareto,
// rank) for a single lens, given user cost options. Used by the Explore UI on
// slider changes. capability/coverage are left untouched.
export function rescoreWithCost(
  models: RankedModel[],
  lensKey: LensKey,
  costOpts: CostOptions
): RankedModel[] {
  const out = models.map((m) => {
    const blendedCost = computeBlendedCost(m.pricing, m.isFree, costOpts);
    return { ...m, blendedCost, costPerMillion: blendedCost };
  });
  fillCostDependent(out, lensKey);
  return out;
}

function fillCostDependent(
  models: RankedModel[],
  lensKey: LensKey
): void {
  const points: FrontierPoint[] = models.map((m) => ({
    id: m.id,
    cost: m.blendedCost,
    capability: m.lenses[lensKey].capability,
  }));
  const frontier = computeFrontier(points);

  for (const m of models) {
    const cap = m.lenses[lensKey].capability;
    const lensScore: LensScore = {
      ...m.lenses[lensKey],
      efficiency: computeEfficiency(cap, m.blendedCost),
      paretoOptimal: frontier.optimal.has(m.id),
      frontierDistance: frontier.distance.get(m.id) ?? 0,
      rank: 0,
    };
    m.lenses[lensKey] = lensScore;
  }

  const byEfficiency = [...models].sort(
    (a, b) => b.lenses[lensKey].efficiency - a.lenses[lensKey].efficiency
  );
  byEfficiency.forEach((m, i) => {
    m.lenses[lensKey].rank = i + 1;
  });
}

// Convenience for pages that just want a ranked list for the default lens.
export function rankModels(models: Model[], config: AppConfig): RankedModel[] {
  const scored = scoreModels(models, config);
  const lens = config.defaultLens;
  return [...scored].sort(
    (a, b) => b.lenses[lens].efficiency - a.lenses[lens].efficiency
  );
}
