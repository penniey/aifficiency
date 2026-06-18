import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  Model,
  Benchmarks,
  BenchmarkKey,
  DesignArenaEntry,
  VariantEntry,
  BenchmarkSource,
  Meta,
} from "../src/lib/types";
import { buildCandidates, resolveId } from "./lib/match";

const DATA_DIR = join(process.cwd(), "data");
const RAW_DIR = join(DATA_DIR, "raw");

// Design Arena categories that reflect coding ability (used for the
// design_arena_code benchmark). Everything present is averaged for
// design_arena_avg.
const CODE_CATEGORIES = new Set([
  "codecategories",
  "fullstack",
  "webapps",
  "mobileapps",
  "androidnative",
]);

type OrModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  knowledge_cutoff?: string | null;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  reasoning?: { mandatory?: boolean };
  pricing?: {
    prompt?: string;
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    web_search?: string;
  };
  benchmarks?: {
    design_arena?: {
      arena: string;
      category: string;
      elo: number;
      win_rate?: number;
      rank?: number;
    }[];
  };
};

type OrFile = { fetchedAt: string; count: number; data: OrModel[] };

type SweRow = { name: string; resolved: number; date?: string; mini_swe_agent_version?: string };
type AiderRow = {
  model: string;
  pass_rate_2: number;
  date?: string;
  reasoning_effort?: string;
  edit_format?: string;
  total_cost?: number;
};

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function meanElo(entries: DesignArenaEntry[]): number | undefined {
  const elos = entries.map((e) => e.elo).filter((e): e is number => typeof e === "number");
  if (elos.length === 0) return undefined;
  return elos.reduce((a, b) => a + b, 0) / elos.length;
}

function toSlug(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const orPath = join(RAW_DIR, "openrouter.json");
  if (!existsSync(orPath)) {
    console.error("data/raw/openrouter.json not found. Run `npm run fetch:openrouter` first.");
    process.exit(1);
  }
  const orFile = readJson<OrFile>(orPath)!;
  const orModels = orFile.data;

  // Supplemental data is optional; merge works on OpenRouter-only data.
  const swePath = join(RAW_DIR, "swebench.json");
  const aiderPath = join(RAW_DIR, "aider.json");
  const sweRows = readJson<SweRow[]>(swePath);
  const aiderRows = readJson<AiderRow[]>(aiderPath);

  const candidates = buildCandidates(orModels.map((m) => ({ id: m.id, name: m.name })));
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  // Resolve supplemental rows to OR ids, keeping the best score per model and
  // every matched variant for display.
  const sweByModel = new Map<string, { value: number; source: BenchmarkSource; variant: VariantEntry }[]>();
  const aiderByModel = new Map<string, { value: number; source: BenchmarkSource; variant: VariantEntry }[]>();
  const unmatched: string[] = [];

  function pushSwe(row: SweRow) {
    const res = resolveId(row.name, candidates, candidateById);
    if (!res) {
      unmatched.push(`swebench: ${row.name}`);
      return;
    }
    const source: BenchmarkSource = {
      url: "https://www.swebench.com/verified.html",
      fetchedAt: new Date().toISOString(),
      asOf: row.date,
    };
    const variant: VariantEntry = {
      benchmark: "swe_bench",
      name: row.name,
      score: row.resolved,
      date: row.date,
    };
    const list = sweByModel.get(res.id) ?? [];
    list.push({ value: row.resolved, source, variant });
    sweByModel.set(res.id, list);
  }

  function pushAider(row: AiderRow) {
    const res = resolveId(row.model, candidates, candidateById);
    if (!res) {
      unmatched.push(`aider: ${row.model}`);
      return;
    }
    const source: BenchmarkSource = {
      url: "https://aider.chat/docs/leaderboards/",
      fetchedAt: new Date().toISOString(),
      asOf: row.date,
    };
    const variant: VariantEntry = {
      benchmark: "aider_polyglot",
      name: row.model,
      score: row.pass_rate_2,
      effort: row.reasoning_effort,
      date: row.date,
      cost: row.total_cost,
    };
    const list = aiderByModel.get(res.id) ?? [];
    list.push({ value: row.pass_rate_2, source, variant });
    aiderByModel.set(res.id, list);
  }

  if (sweRows) sweRows.forEach(pushSwe);
  if (aiderRows) aiderRows.forEach(pushAider);

  const models: Model[] = [];
  const arenaSource: BenchmarkSource = {
    url: "https://lmarena.ai/",
    fetchedAt: orFile.fetchedAt,
  };

  for (const m of orModels) {
    const prompt = Number(m.pricing?.prompt ?? 0) * 1_000_000;
    const completion = Number(m.pricing?.completion ?? 0) * 1_000_000;
    const isFree = prompt === 0 && completion === 0;

    const benchmarks: Benchmarks = {};
    const sources: Partial<Record<BenchmarkKey, BenchmarkSource>> = {};

    const arena = m.benchmarks?.design_arena ?? [];
    const designArena: DesignArenaEntry[] = arena.map((e) => ({
      arena: e.arena,
      category: e.category,
      elo: e.elo,
      win_rate: e.win_rate,
      rank: e.rank,
    }));
    if (designArena.length > 0) {
      const codeEntries = designArena.filter((e) => CODE_CATEGORIES.has(e.category));
      const codeElo = meanElo(codeEntries);
      const avgElo = meanElo(designArena);
      if (codeElo !== undefined) {
        benchmarks.design_arena_code = codeElo;
        sources.design_arena_code = arenaSource;
      }
      if (avgElo !== undefined) {
        benchmarks.design_arena_avg = avgElo;
        sources.design_arena_avg = arenaSource;
      }
    }

    // Supplemental: keep best score as the canonical benchmark, all rows as variants.
    const variants: VariantEntry[] = [];
    const swe = sweByModel.get(m.id);
    if (swe && swe.length > 0) {
      const best = swe.reduce((a, b) => (b.value > a.value ? b : a));
      benchmarks.swe_bench = best.value;
      sources.swe_bench = best.source;
      variants.push(...swe.map((s) => s.variant));
    }
    const aider = aiderByModel.get(m.id);
    if (aider && aider.length > 0) {
      const best = aider.reduce((a, b) => (b.value > a.value ? b : a));
      benchmarks.aider_polyglot = best.value;
      sources.aider_polyglot = best.source;
      variants.push(...aider.map((s) => s.variant));
    }

    // Skip models with no benchmarks and no pricing signal at all (keeps the
    // dataset focused; free models with benchmarks are kept).
    const hasBenchmark = Object.keys(benchmarks).length > 0;
    const hasPricing = !isFree && (prompt > 0 || completion > 0);
    if (!hasBenchmark && !hasPricing) continue;
    // Require at least one benchmark so the rankings show signal, not just price.
    if (!hasBenchmark) continue;

    models.push({
      id: m.id,
      slug: toSlug(m.id),
      name: m.name ?? m.id.split("/").pop() ?? m.id,
      provider: m.id.split("/")[0] ?? "",
      description: m.description,
      contextLength: m.context_length,
      knowledgeCutoff: m.knowledge_cutoff ?? undefined,
      modalities: m.architecture
        ? { input: m.architecture.input_modalities ?? [], output: m.architecture.output_modalities ?? [] }
        : undefined,
      reasoningMandatory: m.reasoning?.mandatory,
      isFree,
      pricing: {
        prompt: Number(prompt.toFixed(6)),
        completion: Number(completion.toFixed(6)),
        ...(m.pricing?.input_cache_read ? { inputCacheRead: Number((Number(m.pricing.input_cache_read) * 1_000_000).toFixed(6)) } : {}),
        ...(m.pricing?.input_cache_write ? { inputCacheWrite: Number((Number(m.pricing.input_cache_write) * 1_000_000).toFixed(6)) } : {}),
        ...(m.pricing?.web_search ? { webSearch: Number((Number(m.pricing.web_search) * 1_000_000).toFixed(6)) } : {}),
      },
      benchmarks,
      designArena: designArena.length ? designArena : undefined,
      variants: variants.length ? variants : undefined,
      sources,
    });
  }

  writeFileSync(join(DATA_DIR, "models.json"), JSON.stringify({ models }, null, 2));

  const meta: Meta = {
    fetchedAt: new Date().toISOString(),
    sources: {
      openrouter: {
        url: "https://openrouter.ai/api/v1/models",
        fetchedAt: orFile.fetchedAt,
        count: orModels.length,
      },
      ...(sweRows
        ? { swebench: { url: "https://www.swebench.com/verified.html", fetchedAt: new Date().toISOString(), count: sweRows.length } }
        : {}),
      ...(aiderRows
        ? { aider: { url: "https://aider.chat/docs/leaderboards/", fetchedAt: new Date().toISOString(), count: aiderRows.length } }
        : {}),
    },
    counts: {
      openRouterModels: orModels.length,
      ranked: models.length,
      unmatched,
    },
  };
  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  console.log(`Merged ${models.length} models (from ${orModels.length} on OpenRouter)`);
  if (sweRows) console.log(`  SWE-bench: ${sweRows.length} rows`);
  if (aiderRows) console.log(`  Aider: ${aiderRows.length} rows`);
  if (unmatched.length > 0) {
    console.warn(`Unmatched supplemental names (${unmatched.length}):`);
    unmatched.slice(0, 40).forEach((u) => console.warn(`  - ${u}`));
  }
}

main();
