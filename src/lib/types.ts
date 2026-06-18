// Core data + scoring schema for AIfficiency.
//
// Intelligence is measured per "lens" (coding / agentic / general). Each lens
// is a weighted combination of benchmarks. Cost is a workload-blended $/1M
// tokens figure. Efficiency is capability-per-log-dollar, and the Pareto
// frontier marks models nobody else dominates on (capability, cost).

export type BenchmarkKey =
  | "swe_bench" // SWE-bench Verified, bash-only / mini-SWE-agent resolved % (0-100)
  | "aider_polyglot" // Aider polyglot benchmark, pass_rate_2 % (0-100)
  | "design_arena_code" // Design Arena Elo, coding-relevant categories, normalized 0-100
  | "design_arena_avg"; // Design Arena Elo, all categories, normalized 0-100

export const BENCHMARK_LABELS: Record<BenchmarkKey, string> = {
  swe_bench: "SWE-bench Verified",
  aider_polyglot: "Aider Polyglot",
  design_arena_code: "Arena (Coding)",
  design_arena_avg: "Arena (Overall)",
};

export const BENCHMARK_UNITS: Record<BenchmarkKey, string> = {
  swe_bench: "%",
  aider_polyglot: "%",
  design_arena_code: "norm",
  design_arena_avg: "norm",
};

export type Benchmarks = Partial<Record<BenchmarkKey, number>>;

// Raw, display-only detail kept alongside the flattened benchmarks.
export type DesignArenaEntry = {
  arena: string;
  category: string;
  elo: number;
  win_rate?: number;
  rank?: number;
};

export type ModelPricing = {
  prompt: number; // $ / 1M tokens
  completion: number; // $ / 1M tokens
  inputCacheRead?: number; // $ / 1M tokens
  inputCacheWrite?: number; // $ / 1M tokens
  webSearch?: number; // $ / 1M tokens (or per-call — kept as-is from OR)
};

export type Model = {
  id: string; // OpenRouter id, e.g. "anthropic/claude-sonnet-4.5"
  slug: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  knowledgeCutoff?: string;
  modalities?: { input: string[]; output: string[] };
  reasoningMandatory?: boolean;
  isFree: boolean;
  pricing?: ModelPricing;
  benchmarks: Benchmarks;
  designArena?: DesignArenaEntry[];
  variants?: VariantEntry[];
  sources: Partial<Record<BenchmarkKey, BenchmarkSource>>;
};

export type BenchmarkSource = {
  url: string;
  fetchedAt: string; // ISO timestamp
  asOf?: string; // YYYY-MM-DD of the underlying data
};

export type VariantEntry = {
  benchmark: BenchmarkKey;
  name: string; // e.g. "gpt-5.5 (high)"
  score: number; // native units
  effort?: string;
  date?: string;
  cost?: number;
};

export type LensKey = "coding" | "agentic" | "general";

export const LENS_LABELS: Record<LensKey, string> = {
  coding: "Coding",
  agentic: "Agentic",
  general: "General",
};

export type LensConfig = {
  key: LensKey;
  label: string;
  description: string;
  weights: Partial<Record<BenchmarkKey, number>>;
};

export type BenchmarkConfig = {
  key: BenchmarkKey;
  label: string;
  sourceUrl: string;
  license?: string; // SPDX-ish short label, e.g. "CC BY-NC 4.0", "Apache-2.0"
  credit?: string; // human-readable attribution, e.g. "SWE-bench / Princeton NLP"
};

export type EloCeiling = { eloMin: number; eloMax: number };

export type Ceiling = number | EloCeiling;

export type ScoringConfig = {
  promptShare: number; // 0-1, fraction of cost attributable to prompt tokens
  useCacheSavings: boolean; // subtract input_cache_read savings from blended cost
  coverageMin: number; // min benchmarks present before the coverage penalty bites
  costEpsilon: number; // $/1M used for free models so log-scale maths stay finite
};

export type AppConfig = {
  defaultLens: LensKey;
  scoring: ScoringConfig;
  ceilings: Record<BenchmarkKey, Ceiling>;
  benchmarks: BenchmarkConfig[];
  lenses: LensConfig[];
};

// Per-lens score for a model. capability/coverage are cost-independent and
// precomputed on the server; efficiency/paretoOptimal/frontierDistance/rank
// depend on the blended cost and are recomputed on the client when the user
// moves the cost sliders.
export type LensScore = {
  capability: number; // 0-100, coverage-penalized
  rawCapability: number; // 0-100, before coverage penalty
  coverage: number; // 0-1, fraction of lens benchmarks present
  presentCount: number;
  efficiency: number;
  paretoOptimal: boolean;
  frontierDistance: number;
  rank: number;
};

export type RankedModel = Model & {
  blendedCost: number; // default-cost (server), recomputed on the client
  costPerMillion: number; // alias of blendedCost (kept for UI back-compat)
  isFree: boolean;
  normalizedBenchmarks: Benchmarks;
  lenses: Record<LensKey, LensScore>;
};

export type Meta = {
  fetchedAt: string; // ISO timestamp of this build
  sources: {
    openrouter?: { url: string; fetchedAt: string; count: number };
    swebench?: { url: string; fetchedAt: string; asOf?: string; count: number };
    aider?: { url: string; fetchedAt: string; asOf?: string; count: number };
  };
  counts: {
    openRouterModels: number;
    ranked: number;
    unmatched: string[];
  };
};
