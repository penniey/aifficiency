"use client";

import { formatNumber } from "./format";

type Tone = "frontier" | "good" | "mid" | "low";

const TONES: Record<Tone, string> = {
  frontier: "bg-amber-100 text-amber-800 ring-1 ring-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-600",
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  mid: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  low: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function EfficiencyBadge({
  value,
  tone,
}: {
  value: number;
  tone: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${TONES[tone]}`}
    >
      {tone === "frontier" ? `${formatNumber(value)} ★` : formatNumber(value)}
    </span>
  );
}
