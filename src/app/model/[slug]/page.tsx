import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, ExternalLink } from "lucide-react";
import { loadModels, loadConfig, loadMeta, getModelBySlug } from "@/lib/data";
import { scoreModels } from "@/lib/efficiency";
import type { BenchmarkKey, LensKey } from "@/lib/types";
import { BENCHMARK_LABELS, LENS_LABELS } from "@/lib/types";
import { ScatterPlot } from "@/components/ScatterPlot";
import { EfficiencyBadge } from "@/components/EfficiencyBadge";
import {
  formatCost,
  formatContext,
  formatDisplayName,
  formatScore,
  formatDate,
} from "@/components/format";

export async function generateStaticParams() {
  const models = await loadModels();
  return models.map((m) => ({ slug: m.slug }));
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [models, config, meta] = await Promise.all([
    loadModels(),
    loadConfig(),
    loadMeta(),
  ]);
  const model = getModelBySlug(models, slug);
  if (!model) notFound();

  const scored = scoreModels(models, config);
  const rankedModel = scored.find((r) => r.id === model.id)!;
  const defaultLens = config.defaultLens;
  const defaultScore = rankedModel.lenses[defaultLens];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {formatDisplayName(model.name)}
          </h1>
          <div className="mt-1 text-sm text-neutral-500">
            <span className="capitalize">{model.provider}</span>
            {model.isFree && (
              <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                free
              </span>
            )}
            {model.reasoningMandatory && (
              <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                reasoning
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="text-xs text-neutral-500">Rank ({LENS_LABELS[defaultLens]})</div>
            <div className="text-2xl font-bold">#{defaultScore.rank}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="text-xs text-neutral-500">Frontier</div>
            <div className="text-2xl font-bold">
              {defaultScore.paretoOptimal ? (
                <span className="inline-flex items-center text-amber-500">
                  <Crown className="h-5 w-5" />
                </span>
              ) : (
                <span className="text-sm font-semibold text-neutral-500">
                  −{defaultScore.frontierDistance.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Blended cost / 1M"
          value={formatCost(rankedModel.blendedCost)}
          sub={`prompt ${formatCost(model.pricing?.prompt)} · completion ${formatCost(
            model.pricing?.completion
          )}`}
        />
        <Stat
          label={`${LENS_LABELS[defaultLens]} capability`}
          value={formatScore(defaultScore.capability)}
          sub={`coverage ${Math.round(defaultScore.coverage * 100)}%`}
        />
        <Stat label="Context window" value={formatContext(model.contextLength)} sub="tokens" />
        <Stat label="Knowledge cutoff" value={formatDate(model.knowledgeCutoff)} sub={undefined} />
      </div>

      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Position on the {LENS_LABELS[defaultLens]} frontier
        </h2>
        <ScatterPlot
          models={scored}
          lens={defaultLens}
          budget={null}
          highlightSlug={model.slug}
        />
      </div>

      {/* Per-lens scores */}
      <div className="mb-8 overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3">Lens</th>
              <th className="px-4 py-3 text-right">Capability</th>
              <th className="px-4 py-3 text-right">Efficiency</th>
              <th className="px-4 py-3 text-right">Rank</th>
              <th className="px-4 py-3 text-right">Frontier</th>
              <th className="px-4 py-3 text-right">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {config.lenses.map((l) => {
              const s = rankedModel.lenses[l.key as LensKey];
              return (
                <tr key={l.key}>
                  <td className="px-4 py-3 font-medium">{l.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatScore(s.capability)}</td>
                  <td className="px-4 py-3 text-right">
                    <EfficiencyBadge
                      value={s.efficiency}
                      tone={s.paretoOptimal ? "frontier" : "mid"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">#{s.rank}</td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500">
                    {s.paretoOptimal ? "on" : s.frontierDistance > 0 ? `−${s.frontierDistance.toFixed(0)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {Math.round(s.coverage * 100)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Benchmark profile */}
      <div className="mb-8 overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3">Benchmark</th>
              <th className="px-4 py-3 text-right">Raw</th>
              <th className="px-4 py-3 text-right">Normalized</th>
              <th className="px-4 py-3 text-right">License</th>
              <th className="px-4 py-3 text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {config.benchmarks.map((b) => {
              const raw = model.benchmarks[b.key as BenchmarkKey];
              const norm = rankedModel.normalizedBenchmarks[b.key as BenchmarkKey];
              const src = model.sources[b.key as BenchmarkKey];
              return (
                <tr key={b.key}>
                  <td className="px-4 py-3 font-medium">{b.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {typeof raw === "number" ? formatScore(raw) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {typeof norm === "number" ? `${norm.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.license ? (
                      <span className="inline-block rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {b.license}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500">
                    {src ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        {src.asOf ? formatDate(src.asOf) : "link"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Effort variants from supplemental benchmarks */}
      {rankedModel.variants && rankedModel.variants.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
          <div className="bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-400">
            Effort / variant scores
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2">Benchmark</th>
                <th className="px-4 py-2">Variant</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rankedModel.variants.map((v, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    {BENCHMARK_LABELS[v.benchmark]}
                  </td>
                  <td className="px-4 py-2 font-medium">{v.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatScore(v.score)}</td>
                  <td className="px-4 py-2 text-right text-xs text-neutral-500">
                    {formatDate(v.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.fetchedAt && (
        <p className="text-xs text-neutral-400">Data as of {formatDate(meta.fetchedAt)}</p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}
