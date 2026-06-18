"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, ChevronDown, X } from "lucide-react";
import type { RankedModel, AppConfig, BenchmarkKey, LensKey } from "@/lib/types";
import { LENS_LABELS } from "@/lib/types";
import { EfficiencyBadge } from "./EfficiencyBadge";
import { formatCost, formatDisplayName, formatScore } from "./format";

const ScatterPlot = dynamic(
  () => import("@/components/ScatterPlot").then((mod) => mod.ScatterPlot),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
    ),
  }
);

export function CompareTool({
  models,
  config,
}: {
  models: RankedModel[];
  config: AppConfig;
}) {
  const [lens, setLens] = useState<LensKey>(config.defaultLens);
  const [leftId, setLeftId] = useState(models[0]?.id ?? "");
  const [rightId, setRightId] = useState(models[1]?.id ?? "");

  const left = useMemo(
    () => models.find((m) => m.id === leftId) ?? models[0],
    [models, leftId]
  );
  const right = useMemo(
    () => models.find((m) => m.id === rightId) ?? models[1],
    [models, rightId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-950">
          {config.lenses.map((l) => (
            <button
              key={l.key}
              onClick={() => setLens(l.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                lens === l.key
                  ? "bg-amber-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModelSelector label="Model A" models={models} selected={leftId} onChange={setLeftId} />
        <ModelSelector label="Model B" models={models} selected={rightId} onChange={setRightId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard model={left} lens={lens} />
        <StatCard model={right} lens={lens} />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          On the {LENS_LABELS[lens]} frontier
        </h2>
        <ScatterPlot
          models={models}
          lens={lens}
          budget={null}
          highlightSlugs={[left.slug, right.slug].filter(Boolean)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3">Benchmark</th>
              <th className="px-4 py-3 text-right">{formatDisplayName(left.name)}</th>
              <th className="px-4 py-3 text-right">{formatDisplayName(right.name)}</th>
              <th className="px-4 py-3 text-right">Winner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {config.benchmarks.map((b) => {
              const l = left.benchmarks[b.key as BenchmarkKey];
              const r = right.benchmarks[b.key as BenchmarkKey];
              const winner =
                typeof l === "number" && typeof r === "number"
                  ? l > r
                    ? formatDisplayName(left.name)
                    : r > l
                    ? formatDisplayName(right.name)
                    : "Tie"
                  : "—";
              return (
                <tr key={b.key}>
                  <td className="px-4 py-3 font-medium">{b.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {typeof l === "number" ? l.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {typeof r === "number" ? r.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500">{winner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ model, lens }: { model: RankedModel; lens: LensKey }) {
  const s = model.lenses[lens];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
      <h3 className="text-lg font-semibold">{formatDisplayName(model.name)}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-neutral-500">Cost / 1M</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatCost(model.blendedCost)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Capability</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatScore(s.capability)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Efficiency</div>
          <div className="mt-0.5">
            <EfficiencyBadge value={s.efficiency} tone={s.paretoOptimal ? "frontier" : "mid"} />
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Frontier</div>
          <div className="mt-0.5 text-sm font-semibold">
            {s.paretoOptimal ? (
              <span className="text-amber-600 dark:text-amber-400">on</span>
            ) : (
              <span className="text-neutral-500">−{s.frontierDistance.toFixed(0)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 text-xs text-neutral-500">
        Rank #{s.rank} · coverage {Math.round(s.coverage * 100)}%
      </div>
    </div>
  );
}

function ModelSelector({
  label,
  models,
  selected,
  onChange,
}: {
  label: string;
  models: RankedModel[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selected) ?? models[0],
    [models, selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) =>
      `${m.name} ${m.provider}`.toLowerCase().includes(q)
    );
  }, [models, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
      >
        {selectedModel ? (
          <span>
            #{selectedModel.lenses.coding.rank} {formatDisplayName(selectedModel.name)}
          </span>
        ) : (
          <span className="text-neutral-400">Select a model...</span>
        )}
        <ChevronDown className="h-4 w-4 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
          <div className="border-b border-neutral-100 p-2 dark:border-neutral-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models..."
                autoFocus
                className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-9 pr-7 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    m.id === selected
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      : ""
                  }`}
                >
                  <span className="font-medium">#{m.lenses.coding.rank} {formatDisplayName(m.name)}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">No models found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
