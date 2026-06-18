import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { loadConfig, loadMeta } from "@/lib/data";
import { formatFreshness } from "@/components/format";

export const metadata = {
  title: "Data sources & licenses — AIfficiency",
};

export default async function SourcesPage() {
  const [config, meta] = await Promise.all([loadConfig(), loadMeta()]);

  const sources = [
    {
      name: "OpenRouter",
      url: "https://openrouter.ai/",
      endpoint: "https://openrouter.ai/api/v1/models",
      provides:
        "Pricing (prompt / completion / cache read-write / web search), context length, modalities, reasoning flag, knowledge cutoff. Also relays Design Arena Elo.",
      license: "OpenRouter ToS — public API for programmatic use",
      fetchedAt: meta.sources.openrouter?.fetchedAt,
      count: meta.sources.openrouter?.count,
    },
    {
      name: "SWE-bench Verified",
      url: "https://www.swebench.com/verified.html",
      endpoint:
        "https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json",
      provides:
        "Resolved % on the bash-only / mini-SWE-agent view (LM-only, apples-to-apples — no agentic scaffolding).",
      license: "CC BY-NC 4.0 (Attribution-NonCommercial)",
      fetchedAt: meta.sources.swebench?.fetchedAt,
      count: meta.sources.swebench?.count,
    },
    {
      name: "Aider Polyglot Leaderboard",
      url: "https://aider.chat/docs/leaderboards/",
      endpoint:
        "https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml",
      provides:
        "pass_rate_2 % across 225 Exercism coding exercises in 6 languages.",
      license: "Apache-2.0",
      fetchedAt: meta.sources.aider?.fetchedAt,
      count: meta.sources.aider?.count,
    },
    {
      name: "LM Arena (Design Arena Elo)",
      url: "https://lmarena.ai/",
      endpoint: "Relayed via OpenRouter /v1/models",
      provides:
        "Crowdsourced-vote Elo per arena category (coding, fullstack, webapps, mobile, etc.). We normalize coding-relevant categories into 'Arena (Coding)' and all categories into 'Arena (Overall)'.",
      license: "Relayed via OpenRouter — attributed to LM Arena",
      fetchedAt: meta.sources.openrouter?.fetchedAt,
      count: undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Data sources &amp; licenses</h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
          AIfficiency is a <strong>non-commercial</strong> project. All data is
          fetched from the public sources below and attributed accordingly. Each
          source retains its own license; see the notes.
        </p>
      </div>

      <div className="space-y-4">
        {sources.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400"
                >
                  {s.name}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </h2>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {s.license}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {s.provides}
            </p>
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              <div>
                <dt className="inline text-neutral-400">Endpoint: </dt>
                <dd className="inline break-all font-mono text-neutral-600 dark:text-neutral-300">
                  {s.endpoint}
                </dd>
              </div>
              <div>
                <dt className="inline text-neutral-400">Last fetched: </dt>
                <dd className="inline text-neutral-600 dark:text-neutral-300">
                  {s.fetchedAt ? formatFreshness(s.fetchedAt) : "—"}
                  {s.count !== undefined ? ` · ${s.count} rows` : ""}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
        <h2 className="mb-2 text-base font-semibold text-neutral-800 dark:text-neutral-200">
          Per-benchmark license map
        </h2>
        <ul className="space-y-1.5">
          {config.benchmarks.map((b) => (
            <li key={b.key} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {b.label}
              </span>
              <span className="flex items-center gap-2">
                {b.credit && (
                  <span className="text-xs text-neutral-500">{b.credit}</span>
                )}
                <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {b.license ?? "—"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 text-xs text-neutral-500">
        <p>
          Pricing data is fetched live from OpenRouter&rsquo;s public models API.
          SWE-bench and Aider data are fetched from their respective GitHub-hosted
          source-of-truth files. Benchmark scores are normalized against fixed
          ceilings (see <code className="font-mono">data/config.json</code>) so
          they stay stable as new models arrive. A daily GitHub Action refreshes
          this data; see{" "}
          <a
            href="https://github.com/swe-bench/SWE-bench"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-amber-600 dark:hover:text-amber-400"
          >
            the repo
          </a>{" "}
          for the pipeline.
        </p>
        <p className="mt-3">
          <strong className="font-semibold text-neutral-600 dark:text-neutral-400">
            Intentionally excluded:
          </strong>{" "}
          Artificial Analysis indices (intelligence / coding / agentic) are a
          commercial third-party benchmark product and are not displayed here,
          even though OpenRouter relays them. See{" "}
          <code className="font-mono">THIRD_PARTY.md</code> for the rationale.
        </p>
        <p className="mt-3">
          <Link href="/" className="underline hover:text-amber-600 dark:hover:text-amber-400">
            Back to explore
          </Link>
        </p>
      </section>
    </div>
  );
}
