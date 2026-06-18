import { describe, it, expect } from "vitest";
import {
  computeBlendedCost,
  normalizeBenchmark,
  coverageFactor,
  computeLensCapability,
  computeEfficiency,
  computeFrontier,
  scoreModels,
  rankModels,
  rescoreWithCost,
} from "./efficiency";
import type { AppConfig, Model, Benchmarks } from "./types";

const config: AppConfig = {
  defaultLens: "coding",
  scoring: { promptShare: 0.3, useCacheSavings: false, coverageMin: 2, costEpsilon: 0.001 },
  ceilings: {
    swe_bench: 100,
    aider_polyglot: 100,
    design_arena_code: { eloMin: 1000, eloMax: 1400 },
    design_arena_avg: { eloMin: 1000, eloMax: 1400 },
  },
  benchmarks: [],
  lenses: [
    {
      key: "coding",
      label: "Coding",
      description: "",
      weights: { swe_bench: 0.5, aider_polyglot: 0.5 },
    },
    {
      key: "general",
      label: "General",
      description: "",
      weights: { design_arena_avg: 1 },
    },
  ],
};

const costOpts = { promptShare: 0.3, useCacheSavings: false, costEpsilon: 0.001 };

function makeModel(
  id: string,
  benchmarks: Partial<Record<keyof AppConfig["ceilings"], number>>,
  pricing: { prompt: number; completion: number; inputCacheRead?: number }
): Model {
  return {
    id,
    slug: id,
    name: id,
    provider: "test",
    isFree: pricing.prompt === 0 && pricing.completion === 0,
    benchmarks,
    pricing,
    sources: {},
  };
}

describe("computeBlendedCost", () => {
  it("weights prompt and completion by the prompt share", () => {
    const c = computeBlendedCost({ prompt: 10, completion: 20 }, false, { ...costOpts, promptShare: 0.3 });
    expect(c).toBeCloseTo(10 * 0.3 + 20 * 0.7, 5);
  });
  it("returns epsilon for free models even with zero pricing", () => {
    const c = computeBlendedCost({ prompt: 0, completion: 0 }, true, costOpts);
    expect(c).toBe(0.001);
  });
  it("applies cache-read savings when enabled", () => {
    const without = computeBlendedCost({ prompt: 10, completion: 20, inputCacheRead: 1 }, false, {
      ...costOpts,
      useCacheSavings: false,
    });
    const withCache = computeBlendedCost({ prompt: 10, completion: 20, inputCacheRead: 1 }, false, {
      ...costOpts,
      useCacheSavings: true,
    });
    expect(withCache).toBeLessThan(without);
  });
});

describe("normalizeBenchmark", () => {
  it("scales a 0-100 benchmark by a numeric ceiling", () => {
    expect(normalizeBenchmark(50, 100)).toBe(50);
    expect(normalizeBenchmark(120, 100)).toBe(100);
  });
  it("maps Elo to 0-100 across the configured range and clamps", () => {
    expect(normalizeBenchmark(1200, { eloMin: 1000, eloMax: 1400 })).toBe(50);
    expect(normalizeBenchmark(800, { eloMin: 1000, eloMax: 1400 })).toBe(0);
    expect(normalizeBenchmark(1500, { eloMin: 1000, eloMax: 1400 })).toBe(100);
  });
});

describe("coverageFactor", () => {
  it("is 1 at or above the coverage minimum, scales below it", () => {
    expect(coverageFactor(2, 2)).toBe(1);
    expect(coverageFactor(3, 2)).toBe(1);
    expect(coverageFactor(1, 2)).toBe(0.75);
    expect(coverageFactor(0, 2)).toBe(0);
  });
});

describe("computeLensCapability", () => {
  it("weights only present benchmarks and penalizes thin coverage", () => {
    const norm = { aider_polyglot: 80, swe_bench: 60 } as Benchmarks;
    const lens = config.lenses[0];
    const full = computeLensCapability(norm, norm, lens, 2);
    expect(full.capability).toBeCloseTo(70, 1);
    expect(full.coverage).toBe(1);
    expect(full.presentCount).toBe(2);

    const thinNorm = { aider_polyglot: 80 } as Benchmarks;
    const thin = computeLensCapability(thinNorm, thinNorm, lens, 2);
    // 0.75 coverage factor on a single 80 -> 60
    expect(thin.capability).toBeCloseTo(60, 1);
    expect(thin.coverage).toBe(0.5);
  });
});

describe("computeEfficiency", () => {
  it("stays finite for free/epsilon-cost models", () => {
    const e = computeEfficiency(50, 0.001);
    expect(e).toBeGreaterThan(0);
    expect(Number.isFinite(e)).toBe(true);
  });
  it("rewards higher capability at equal cost", () => {
    expect(computeEfficiency(80, 5)).toBeGreaterThan(computeEfficiency(40, 5));
  });
  it("rewards lower cost at equal capability", () => {
    expect(computeEfficiency(60, 1)).toBeGreaterThan(computeEfficiency(60, 10));
  });
});

describe("computeFrontier", () => {
  it("marks non-dominated models and distances for dominated ones", () => {
    const pts = [
      { id: "a", cost: 1, capability: 40 },
      { id: "b", cost: 2, capability: 50 },
      { id: "c", cost: 3, capability: 45 }, // dominated by b (cheaper, higher)
      { id: "d", cost: 4, capability: 60 },
    ];
    const f = computeFrontier(pts);
    expect([...f.optimal].sort()).toEqual(["a", "b", "d"]);
    expect(f.distance.get("c")).toBe(5); // b beats c by 5 capability at lower cost
    expect(f.distance.get("a")).toBe(0);
  });
});

describe("scoreModels / rankModels", () => {
  it("includes free models rather than dropping them", () => {
    const models = [
      makeModel("paid", { aider_polyglot: 60, swe_bench: 60 }, { prompt: 5, completion: 5 }),
      makeModel("free", { aider_polyglot: 50, swe_bench: 50 }, { prompt: 0, completion: 0 }),
    ];
    const ranked = rankModels(models, config);
    expect(ranked.map((m) => m.id).sort()).toEqual(["free", "paid"]);
  });

  it("assigns per-lens ranks by efficiency and keeps capability stable across cost changes", () => {
    const models = [
      makeModel("cheap", { aider_polyglot: 50, swe_bench: 50 }, { prompt: 0.5, completion: 0.5 }),
      makeModel("pricey", { aider_polyglot: 90, swe_bench: 90 }, { prompt: 20, completion: 20 }),
    ];
    const scored = scoreModels(models, config);
    const capCheap = scored.find((m) => m.id === "cheap")!.lenses.coding.capability;
    const capPricey = scored.find((m) => m.id === "pricey")!.lenses.coding.capability;
    expect(capPricey).toBeGreaterThan(capCheap);

    const rescored = rescoreWithCost(scored, "coding", { ...costOpts, promptShare: 0.9 });
    // capability is cost-independent: unchanged after re-scoring.
    expect(rescored.find((m) => m.id === "cheap")!.lenses.coding.capability).toBe(capCheap);
    // ranks are populated.
    const ranks = rescored.map((m) => m.lenses.coding.rank).sort();
    expect(ranks).toEqual([1, 2]);
  });

  it("does not let a single high benchmark dominate a multi-benchmark lens", () => {
    const oneHit = makeModel("onehit", { aider_polyglot: 100 }, { prompt: 1, completion: 1 });
    const balanced = makeModel("balanced", { aider_polyglot: 70, swe_bench: 70 }, { prompt: 1, completion: 1 });
    const scored = scoreModels([oneHit, balanced], config);
    const one = scored.find((m) => m.id === "onehit")!.lenses.coding.capability;
    const bal = scored.find((m) => m.id === "balanced")!.lenses.coding.capability;
    // 100 with 0.75 coverage factor -> 75; 70 with full coverage -> 70.
    expect(one).toBeCloseTo(75, 1);
    expect(bal).toBeCloseTo(70, 1);
    expect(one).toBeGreaterThan(bal); // still higher, but coverage shrank the gap
  });
});
