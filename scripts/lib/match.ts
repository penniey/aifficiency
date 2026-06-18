// Resolves supplemental benchmark model names to OpenRouter model ids.
//
// Supplemental leaderboards (SWE-bench, Aider) name models in their own
// conventions — "Claude 4.5 Opus (high reasoning)", "gpt-5 (high)",
// "claude-opus-4-20250514 (32k thinking)". OpenRouter ids look like
// "anthropic/claude-opus-4.5". We normalize, try a direct id/name match, fall
// back to a curated alias table for naming inversions, and finally a guarded
// substring heuristic. Every resolution carries a confidence and unmatched
// names are surfaced so the alias table can be grown over time.

export type Candidate = {
  id: string; // "anthropic/claude-opus-4.5"
  idSlug: string; // "anthropic-claude-opus-4-5"
  modelSlug: string; // slug of the part after the provider slash
  nameSlug: string; // slug of the human name
};

export type Resolution = {
  id: string;
  confidence: number; // 1.0 exact, 0.9 alias, 0.7 substring
  via: "exact" | "alias" | "substring";
};

const EFFORT_WORDS = [
  "high",
  "medium",
  "low",
  "xhigh",
  "extra",
  "effort",
  "reasoning",
  "thinking",
  "think",
  "default",
  "max",
  "no",
  "init",
];

function dropNoise(input: string): string {
  let s = input.toLowerCase();
  // Drop parenthetical and bracketed qualifiers (effort, dates, "32k thinking").
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\[[^\]]*\]/g, " ");
  // Drop standalone date stamps.
  s = s.replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  s = s.replace(/\b\d{8}\b/g, " ");
  // Drop effort/think tokens.
  const eff = EFFORT_WORDS.join("|");
  s = s.replace(new RegExp(`\\b(?:${eff})\\b`, "g"), " ");
  return s;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeName(input: string): string {
  return slugify(dropNoise(input));
}

// Curated fallbacks for naming conventions that normalization can't reconcile
// (notably Anthropic's "Claude X.Y Opus" vs OpenRouter's "claude-opus-X.Y").
const ALIASES: Record<string, string> = {
  // Anthropic — inverted family/version order.
  "claude-4-5-opus": "anthropic/claude-opus-4.5",
  "claude-opus-4-5": "anthropic/claude-opus-4.5",
  "claude-4-5-sonnet": "anthropic/claude-sonnet-4.5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4.5",
  "claude-4-5-haiku": "anthropic/claude-haiku-4.5",
  "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
  "claude-4-opus": "anthropic/claude-opus-4",
  "claude-opus-4": "anthropic/claude-opus-4",
  "claude-4-sonnet": "anthropic/claude-sonnet-4",
  "claude-sonnet-4": "anthropic/claude-sonnet-4",
  "claude-3-7-sonnet": "anthropic/claude-3.7-sonnet",
  "claude-3-5-sonnet": "anthropic/claude-3.5-sonnet",
  "claude-3-5-haiku": "anthropic/claude-3.5-haiku",

  // OpenAI — dashed vs dotted versions, codex variants.
  "gpt-5-2": "openai/gpt-5.2",
  "gpt-5-2-codex": "openai/gpt-5.2-codex",
  "gpt-5-1": "openai/gpt-5.1",
  "gpt-5-1-codex": "openai/gpt-5.1-codex",
  "gpt-5": "openai/gpt-5",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-5-nano": "openai/gpt-5-nano",
  "gpt-4-1": "openai/gpt-4.1",
  "gpt-4-1-mini": "openai/gpt-4.1-mini",
  "gpt-4-1-nano": "openai/gpt-4.1-nano",
  "gpt-4-5-preview": "openai/gpt-4.5-preview",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "o3": "openai/o3",
  "o3-pro": "openai/o3-pro",
  "o3-mini": "openai/o3-mini",
  "o4-mini": "openai/o4-mini",
  "o1": "openai/o1",
  "o1-mini": "openai/o1-mini",
  "gpt-oss-120b": "openai/gpt-oss-120b",
  "gpt-oss-20b": "openai/gpt-oss-20b",

  // Google Gemini.
  "gemini-3-flash": "google/gemini-3-flash",
  "gemini-3-pro": "google/gemini-3-pro",
  "gemini-3-pro-preview": "google/gemini-3-pro-preview",
  "gemini-2-5-pro": "google/gemini-2.5-pro",
  "gemini-2-5-flash": "google/gemini-2.5-flash",
  "gemini-2-0-flash": "google/gemini-2.0-flash",
  "gemini-2-0-pro": "google/gemini-2.0-pro",
  "gemma-3-27b-it": "google/gemma-3-27b-it",

  // Zhipu GLM.
  "glm-5": "z-ai/glm-5",
  "glm-4-6": "z-ai/glm-4.6",
  "glm-4-5": "z-ai/glm-4.5",

  // Moonshot Kimi.
  "kimi-k2": "moonshotai/kimi-k2",
  "kimi-k2-5": "moonshotai/kimi-k2.5",
  "kimi-k2-thinking": "moonshotai/kimi-k2-thinking",
  "kimi-k2-instruct": "moonshotai/kimi-k2-instruct",

  // MiniMax.
  "minimax-m2": "minimax/minimax-m2",
  "minimax-m2-5": "minimax/minimax-m2.5",
  "minimax-m3": "minimax/minimax-m3",

  // DeepSeek.
  "deepseek-v3-2": "deepseek/deepseek-v3.2",
  "deepseek-v3-2-exp": "deepseek/deepseek-v3.2",
  "deepseek-v3-2-exp-reasoner": "deepseek/deepseek-reasoner",
  "deepseek-v3-2-reasoner": "deepseek/deepseek-reasoner",
  "deepseek-v3": "deepseek/deepseek-chat",
  "deepseek-chat": "deepseek/deepseek-chat",
  "deepseek-reasoner": "deepseek/deepseek-reasoner",
  "deepseek-r1": "deepseek/deepseek-r1",

  // xAI Grok.
  "grok-4": "x-ai/grok-4",
  "grok-3": "x-ai/grok-3-beta",
  "grok-3-beta": "x-ai/grok-3-beta",
  "grok-3-mini": "x-ai/grok-3-mini-beta",
  "grok-3-mini-beta": "x-ai/grok-3-mini-beta",

  // Qwen.
  "qwen3-coder-480b-a35b-instruct": "qwen/qwen3-coder-480b-a35b-instruct",
  "qwen3-32b": "qwen/qwen3-32b",
  "qwen3-235b-a22b": "qwen/qwen3-235b-a22b",
  "qwen2-5-coder-32b-instruct": "qwen/qwen-2.5-coder-32b-instruct",
  "qwen2-5-coder-32b": "qwen/qwen-2.5-coder-32b-instruct",
  "qwq-32b": "qwen/qwq-32b",

  // Meta Llama.
  "llama-4-maverick": "meta-llama/llama-4-maverick",
  "llama-4-maverick-instruct": "meta-llama/llama-4-maverick",
  "llama-4-scout": "meta-llama/llama-4-scout",
  "llama-4-scout-instruct": "meta-llama/llama-4-scout",

  // Mistral.
  "devstral-small": "mistralai/devstral-small",
  "devstral": "mistralai/devstral",
  "codestral": "mistralai/codestral",
  "codestral-25-01": "mistralai/codestral",

  // Cohere.
  "command-a": "cohere/command-a",

  // 01.AI.
  "yi-lightning": "01-ai/yi-lightning",

  // OpenRouter passthroughs.
  "quasar-alpha": "openrouter/quasar-alpha",
  "optimus-alpha": "openrouter/optimus-alpha",
};

export function buildCandidates(models: { id: string; name?: string }[]): Candidate[] {
  return models.map((m) => {
    const idSlug = slugify(m.id);
    const modelPart = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
    const modelSlug = slugify(modelPart);
    const nameSlug = m.name ? slugify(m.name) : "";
    return { id: m.id, idSlug, modelSlug, nameSlug };
  });
}

export function resolveId(
  name: string,
  candidates: Candidate[],
  candidateById: Map<string, Candidate>
): Resolution | null {
  const q = normalizeName(name);
  if (!q) return null;

  // 1. Exact match against id slug, model-part slug, or name slug.
  for (const c of candidates) {
    if (c.modelSlug === q || c.idSlug === q || (c.nameSlug && c.nameSlug === q)) {
      return { id: c.id, confidence: 1, via: "exact" };
    }
  }

  // 2. Curated alias (only if the target id actually exists).
  const alias = ALIASES[q];
  if (alias && candidateById.has(alias)) {
    return { id: alias, confidence: 0.9, via: "alias" };
  }
  // Try a few alias keys derived from the query (handles leftover suffixes).
  for (const key of [q.replace(/-instruct$/, ""), q.replace(/-chat$/, ""), q.replace(/-reasoner$/, "")]) {
    const a = ALIASES[key];
    if (a && candidateById.has(a)) {
      return { id: a, confidence: 0.9, via: "alias" };
    }
  }

  // 3. Guarded substring: the shorter slug must be at least 6 chars and be
  //    contained in the longer one, to avoid short-token false positives.
  const best: { c: Candidate; len: number } | null = null as
    | { c: Candidate; len: number }
    | null;
  let chosen: Candidate | null = null;
  let chosenLen = 0;
  for (const c of candidates) {
    const targets = [c.modelSlug, c.nameSlug].filter(Boolean);
    for (const t of targets) {
      const [shorter, longer] = q.length <= t.length ? [q, t] : [t, q];
      if (shorter.length < 6) continue;
      if (longer.includes(shorter) && longer.length > chosenLen) {
        chosen = c;
        chosenLen = longer.length;
      }
    }
  }
  if (chosen) {
    void best;
    return { id: chosen.id, confidence: 0.7, via: "substring" };
  }

  return null;
}
