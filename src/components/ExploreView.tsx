"use client";

import { useMemo, useState } from "react";
import type { RankedModel, AppConfig, LensKey } from "@/lib/types";
import { rescoreWithCost } from "@/lib/efficiency";
import { ExploreControls, type ExploreFilters } from "./ExploreControls";
import { ScatterPlot } from "./ScatterPlot";
import { RankingsTable } from "./RankingsTable";

type View = "both" | "scatter" | "table";

export function ExploreView({
  models,
  config,
}: {
  models: RankedModel[];
  config: AppConfig;
}) {
  const [filters, setFilters] = useState<ExploreFilters>({
    lens: config.defaultLens,
    promptShare: config.scoring.promptShare,
    useCacheSavings: config.scoring.useCacheSavings,
    maxCost: "",
    minCoverage: 0,
    providers: [],
    search: "",
    showFree: false,
    budget: "",
  });
  const [view, setView] = useState<View>("both");

  const providers = useMemo(
    () => Array.from(new Set(models.map((m) => m.provider))).sort(),
    [models]
  );

  // Filter FIRST, then rescore on the filtered subset so rank / Pareto /
  // frontierDistance reflect exactly what's visible. This is what makes the
  // Rank column read 1..N and update live as filters change.
  const filtered = useMemo(() => {
    const costOpts = {
      promptShare: filters.promptShare,
      useCacheSavings: filters.useCacheSavings,
      costEpsilon: config.scoring.costEpsilon,
    };
    const q = filters.search.trim().toLowerCase();
    const subset = models.filter((m) => {
      if (!filters.showFree && m.isFree) return false;
      if (filters.maxCost !== "" && m.blendedCost > Number(filters.maxCost)) return false;
      if (m.lenses[filters.lens].coverage < filters.minCoverage) return false;
      if (filters.providers.length > 0 && !filters.providers.includes(m.provider)) return false;
      if (q && !(`${m.name} ${m.provider}`.toLowerCase().includes(q))) return false;
      return true;
    });
    return rescoreWithCost(subset, filters.lens, costOpts);
  }, [models, config, filters]);

  const lens: LensKey = filters.lens;
  const budget = filters.budget === "" ? null : Number(filters.budget);

  return (
    <div className="space-y-5">
      <ExploreControls
        filters={filters}
        onChange={setFilters}
        config={config}
        providers={providers}
      />

      <div className="flex items-center justify-end">
        <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-950">
          {(["both", "scatter", "table"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition ${
                view === v
                  ? "bg-amber-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {(view === "both" || view === "scatter") && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
          <ScatterPlot models={filtered} lens={lens} budget={budget} />
        </div>
      )}

      {(view === "both" || view === "table") && (
        <RankingsTable models={filtered} config={config} lens={lens} />
      )}
    </div>
  );
}
