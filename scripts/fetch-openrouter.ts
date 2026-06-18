import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Fetches OpenRouter's /v1/models and keeps everything we need:
//   - full pricing (prompt/completion/cache_read/cache_write/web_search)
//   - context length, knowledge cutoff, modalities, reasoning flag
//   - embedded Design Arena Elo
//
// The raw payload is saved verbatim (it also contains Artificial Analysis
// indices, which we intentionally do NOT use — see THIRD_PARTY.md).
//
// Outputs:
//   data/raw/openrouter.json  - the full payload (for re-derivation / merge)
//   data/pricing.json         - id -> flat pricing (kept for direct use)
//   data/as-of.json           - fetch timestamps consumed by merge.ts

const DATA_DIR = join(process.cwd(), "data");
const RAW_DIR = join(DATA_DIR, "raw");

type OrPricing = {
  prompt?: string;
  completion?: string;
  input_cache_read?: string;
  input_cache_write?: string;
  web_search?: string;
  image?: string;
  audio?: string;
};

type OrDesignArenaEntry = {
  arena: string;
  category: string;
  elo: number;
  win_rate?: number;
  rank?: number;
};

type OrModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  knowledge_cutoff?: string | null;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  reasoning?: { mandatory?: boolean };
  pricing?: OrPricing;
  benchmarks?: {
    design_arena?: OrDesignArenaEntry[];
  };
};

type OrResponse = { data: OrModel[] };

const PER_TOKEN_TO_PER_M = 1_000_000;

function num(v: string | number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function perTokenToPerMillion(v: string | number | null | undefined): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  return Number((n * PER_TOKEN_TO_PER_M).toFixed(6));
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) {
    throw new Error(`OpenRouter API returned ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as OrResponse;
  const data = json.data ?? [];
  const fetchedAt = new Date().toISOString();

  await writeFile(
    join(RAW_DIR, "openrouter.json"),
    JSON.stringify({ fetchedAt, count: data.length, data }, null, 2)
  );

  const pricing: Record<
    string,
    {
      prompt: number;
      completion: number;
      inputCacheRead?: number;
      inputCacheWrite?: number;
      webSearch?: number;
      contextLength?: number;
      isFree: boolean;
    }
  > = {};

  for (const m of data) {
    const prompt = perTokenToPerMillion(m.pricing?.prompt) ?? 0;
    const completion = perTokenToPerMillion(m.pricing?.completion) ?? 0;
    const inputCacheRead = perTokenToPerMillion(m.pricing?.input_cache_read);
    const inputCacheWrite = perTokenToPerMillion(m.pricing?.input_cache_write);
    const webSearch = perTokenToPerMillion(m.pricing?.web_search);
    const isFree = prompt === 0 && completion === 0;

    pricing[m.id] = {
      prompt,
      completion,
      ...(inputCacheRead !== undefined ? { inputCacheRead } : {}),
      ...(inputCacheWrite !== undefined ? { inputCacheWrite } : {}),
      ...(webSearch !== undefined ? { webSearch } : {}),
      contextLength: m.context_length,
      isFree,
    };
  }

  await writeFile(join(DATA_DIR, "pricing.json"), JSON.stringify(pricing, null, 2));
  await writeFile(
    join(DATA_DIR, "as-of.json"),
    JSON.stringify(
      { openrouter: { url: "https://openrouter.ai/api/v1/models", fetchedAt, count: data.length } },
      null,
      2
    )
  );

  console.log(`Fetched ${data.length} models from OpenRouter`);
  console.log(`  raw  -> ${join(RAW_DIR, "openrouter.json")}`);
  console.log(`  flat -> ${join(DATA_DIR, "pricing.json")}`);
  console.log(`  meta -> ${join(DATA_DIR, "as-of.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
