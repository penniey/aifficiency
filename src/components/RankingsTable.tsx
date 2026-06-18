"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DollarSign, TrendingUp, Crown } from "lucide-react";
import type { RankedModel, AppConfig, LensKey, BenchmarkKey } from "@/lib/types";
import { formatCost, formatDisplayName, formatScore } from "./format";
import { EfficiencyBadge } from "./EfficiencyBadge";

type SortKey = "rank" | "efficiency" | "cost" | "capability";

export function RankingsTable({
  models,
  config,
  lens,
}: {
  models: RankedModel[];
  config: AppConfig;
  lens: LensKey;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("asc");

  const maxEfficiency = useMemo(
    () => Math.max(1, ...models.map((m) => m.lenses[lens].efficiency)),
    [models, lens]
  );

  const sorted = useMemo(() => {
    const rows = [...models].sort((a, b) => {
      const la = a.lenses[lens];
      const lb = b.lenses[lens];
      let cmp = 0;
      if (sortBy === "rank") cmp = la.rank - lb.rank;
      else if (sortBy === "efficiency") cmp = la.efficiency - lb.efficiency;
      else if (sortBy === "cost") cmp = a.blendedCost - b.blendedCost;
      else cmp = la.capability - lb.capability;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return rows;
  }, [models, lens, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(key);
      // Rank & cost read naturally ascending; capability/efficiency descending.
      setSortDir(key === "rank" || key === "cost" ? "asc" : "desc");
    }
  };

  const sortArrow = (k: SortKey) => (sortBy === k ? (sortDir === "desc" ? " ↓" : " ↑") : "");

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-400">
            <tr>
              <th
                className="cursor-pointer select-none px-4 py-3"
                onClick={() => toggleSort("rank")}
              >
                Rank{sortArrow("rank")}
              </th>
              <th className="px-4 py-3">Model</th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-right"
                onClick={() => toggleSort("cost")}
              >
                Cost / 1M{sortArrow("cost")}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-right"
                onClick={() => toggleSort("capability")}
              >
                Capability{sortArrow("capability")}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-right"
                onClick={() => toggleSort("efficiency")}
              >
                Efficiency{sortArrow("efficiency")}
              </th>
              <th className="px-4 py-3 text-right">Frontier</th>
              <th className="px-4 py-3 text-right">Coverage</th>
              {config.benchmarks.map((b) => (
                <th key={b.key} className="px-4 py-3 text-right">
                  {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sorted.map((model) => {
              const s = model.lenses[lens];
              const tone =
                s.paretoOptimal ? "frontier"
                : s.efficiency >= maxEfficiency * 0.6 ? "good"
                : s.efficiency >= maxEfficiency * 0.3 ? "mid"
                : "low";
              return (
                <tr
                  key={model.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                >
                  <td className="px-4 py-3 font-mono text-neutral-500">
                    {s.paretoOptimal ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Crown className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      s.rank
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/model/${model.slug}`}
                      className="hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      {formatDisplayName(model.name)}
                    </Link>
                    {model.isFree && (
                      <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        free
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-neutral-400" />
                      {formatCost(model.blendedCost)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-neutral-400" />
                      {formatScore(s.capability)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EfficiencyBadge value={s.efficiency} tone={tone} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500 tabular-nums">
                    {s.paretoOptimal ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">on</span>
                    ) : s.frontierDistance > 0 ? (
                      <span>−{s.frontierDistance.toFixed(0)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500 tabular-nums">
                    {Math.round(s.coverage * 100)}%
                  </td>
                  {config.benchmarks.map((b) => {
                    const raw = model.benchmarks[b.key as BenchmarkKey];
                    return (
                      <td
                        key={b.key}
                        className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400"
                      >
                        {typeof raw === "number" ? formatScore(raw) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="p-8 text-center text-neutral-500">No models match your filters.</div>
      )}
    </div>
  );
}
