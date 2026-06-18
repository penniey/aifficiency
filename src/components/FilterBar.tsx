"use client";

import { Search } from "lucide-react";

export type Filters = {
  maxPrice: number | "";
  search: string;
  sortBy: "efficiency" | "cost" | "composite";
  sortDir: "desc" | "asc";
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Model name..."
            className="w-full rounded-lg border border-neutral-300 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Max cost / 1M tokens
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={filters.maxPrice}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice:
                e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          placeholder="e.g. 10"
          className="w-32 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Sort by
        </label>
        <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-950">
          {(
            [
              ["efficiency", "Efficiency"],
              ["cost", "Cost"],
              ["composite", "Score"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                onChange({
                  ...filters,
                  sortBy: key,
                  sortDir:
                    filters.sortBy === key
                      ? filters.sortDir === "desc"
                        ? "asc"
                        : "desc"
                      : key === "cost"
                      ? "asc"
                      : "desc",
                })
              }
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                filters.sortBy === key
                  ? "bg-amber-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {label} {filters.sortBy === key && (filters.sortDir === "desc" ? "↓" : "↑")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
