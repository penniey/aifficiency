"use client";

import { Search, Filter, X } from "lucide-react";
import type { AppConfig, LensKey } from "@/lib/types";
import { Toggle } from "./Toggle";

export type ExploreFilters = {
  lens: LensKey;
  promptShare: number; // 0-1
  useCacheSavings: boolean;
  maxCost: number | "";
  minCoverage: number; // 0-1
  providers: string[]; // empty = all
  search: string;
  showFree: boolean;
  budget: number | "";
};

export function ExploreControls({
  filters,
  onChange,
  config,
  providers,
}: {
  filters: ExploreFilters;
  onChange: (f: ExploreFilters) => void;
  config: AppConfig;
  providers: string[];
}) {
  const set = (patch: Partial<ExploreFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
      {/* Top row: lens tabs + search (full width) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-950">
          {config.lenses.map((l) => (
            <button
              key={l.key}
              onClick={() => set({ lens: l.key })}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                filters.lens === l.key
                  ? "bg-amber-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
              title={l.description}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search model or provider..."
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: "" })}
              className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {config.lenses.find((l) => l.key === filters.lens)?.description}
      </p>

      {/* Sliders + numeric inputs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Prompt / completion mix */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Prompt share: {Math.round(filters.promptShare * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(filters.promptShare * 100)}
            onChange={(e) => set({ promptShare: Number(e.target.value) / 100 })}
            className="w-full accent-amber-500"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-neutral-400">
            <span>completion-heavy</span>
            <span>prompt-heavy</span>
          </div>
        </div>

        {/* Budget query */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Best for budget $/1M
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={filters.budget}
            onChange={(e) =>
              set({ budget: e.target.value === "" ? "" : Number(e.target.value) })
            }
            placeholder="e.g. 5"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>

        {/* Max cost */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Max cost / 1M
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={filters.maxCost}
            onChange={(e) =>
              set({ maxCost: e.target.value === "" ? "" : Number(e.target.value) })
            }
            placeholder="no limit"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>

        {/* Min coverage */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Min coverage: {Math.round(filters.minCoverage * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={Math.round(filters.minCoverage * 100)}
            onChange={(e) => set({ minCoverage: Number(e.target.value) / 100 })}
            className="w-full accent-amber-500"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap items-center gap-6">
        <Toggle
          checked={filters.showFree}
          onChange={(v) => set({ showFree: v })}
          label="Show free models"
        />
        <Toggle
          checked={filters.useCacheSavings}
          onChange={(v) => set({ useCacheSavings: v })}
          label="Cache savings"
        />
      </div>

      {/* Providers */}
      <ProviderFilter
        providers={providers}
        selected={filters.providers}
        onToggle={(p) =>
          set({
            providers: filters.providers.includes(p)
              ? filters.providers.filter((x) => x !== p)
              : [...filters.providers, p],
          })
        }
        onClear={() => set({ providers: [] })}
      />
    </div>
  );
}

function ProviderFilter({
  providers,
  selected,
  onToggle,
  onClear,
}: {
  providers: string[];
  selected: string[];
  onToggle: (p: string) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">
        <Filter className="mr-1 inline h-3 w-3" />
        Providers {selected.length > 0 && `(${selected.length} selected)`}
      </label>
      <div className="flex max-h-24 flex-wrap content-start gap-1.5 overflow-y-auto rounded-lg border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-950">
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          >
            <X className="h-2.5 w-2.5" /> clear
          </button>
        )}
        {providers.map((p) => {
          const active = selected.includes(p);
          return (
            <button
              key={p}
              onClick={() => onToggle(p)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                active
                  ? "bg-amber-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
