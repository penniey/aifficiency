"use client";

import { useEffect, useState } from "react";
import { CompareTool } from "@/components/CompareTool";
import { CompareSkeleton } from "@/components/CompareSkeleton";
import type { RankedModel, AppConfig, Meta } from "@/lib/types";

export default function ComparePage() {
  const [data, setData] = useState<{
    models: RankedModel[];
    config: AppConfig;
    meta?: Meta;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rankings")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json() as Promise<{
          models: RankedModel[];
          config: AppConfig;
          meta?: Meta;
        }>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load models");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <CompareSkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compare models</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          See where two models sit on the capability-vs-cost frontier and how
          their benchmarks differ.
        </p>
      </div>
      <CompareTool models={data.models} config={data.config} />
    </div>
  );
}
