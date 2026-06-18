"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RankedModel, LensKey } from "@/lib/types";
import { formatCost, formatDisplayName } from "./format";
import { useIsClient } from "./useIsClient";

// Log-friendly candidate tick values for the cost axis. We keep only those
// inside the current data domain, so the axis always shows ~3-6 clean labels
// instead of recharts' auto-generated clutter.
const COST_TICK_CANDIDATES = [0.001, 0.01, 0.1, 1, 5, 10, 50, 100, 500];

function costTicks(domainMin: number, domainMax: number): number[] {
  return COST_TICK_CANDIDATES.filter((t) => t >= domainMin * 0.95 && t <= domainMax * 1.05);
}

function formatCostTick(v: number): string {
  if (v < 0.01) return `$${v.toFixed(3)}`;
  if (v < 1) return `$${v.toFixed(2)}`;
  if (v < 10) return `$${v.toFixed(1)}`;
  return `$${Math.round(v)}`;
}

// Stable, distinguishable colors per provider family.
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#d97706",
  openai: "#10b981",
  google: "#3b82f6",
  deepseek: "#8b5cf6",
  moonshotai: "#ec4899",
  mistralai: "#f43f5e",
  meta: "#06b6d4",
  "meta-llama": "#06b6d4",
  qwen: "#0ea5e9",
  "x-ai": "#111827",
  "z-ai": "#84cc16",
  minimax: "#a855f7",
  nvidia: "#22c55e",
  amazon: "#f97316",
  microsoft: "#2563eb",
  cohere: "#e11d48",
  "01-ai": "#14b8a6",
};

const DEFAULT_COLOR = "#737373";

function colorFor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? DEFAULT_COLOR;
}

type Point = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  cost: number;
  capability: number;
  coverage: number;
  isFree: boolean;
  isFrontier: boolean;
  efficiency: number;
  frontierY: number | null;
};

type ChartClickEvent = { activePayload?: Array<{ payload?: { slug?: string } }> };
type ScatterShapeProps = { cx?: number; cy?: number; payload?: Point };
type ScatterTooltipProps = { active?: boolean; payload?: Array<{ payload: Point }> };

function readClickSlug(e: unknown): string | undefined {
  const ev = e as ChartClickEvent;
  return ev?.activePayload?.[0]?.payload?.slug;
}

export function ScatterPlot({
  models,
  lens,
  budget,
  highlightSlug,
  highlightSlugs,
}: {
  models: RankedModel[];
  lens: LensKey;
  budget: number | null;
  highlightSlug?: string;
  highlightSlugs?: string[];
}) {
  const isClient = useIsClient();
  const router = useRouter();

  const { data, frontier } = useMemo(() => {
    const points: Point[] = models.map((m) => {
      const s = m.lenses[lens];
      const isFrontier = s.paretoOptimal;
      return {
        id: m.id,
        slug: m.slug,
        name: formatDisplayName(m.name),
        provider: m.provider,
        cost: m.blendedCost,
        capability: s.capability,
        coverage: s.coverage,
        isFree: m.isFree,
        isFrontier,
        efficiency: s.efficiency,
        frontierY: isFrontier ? s.capability : null,
      };
    });
    // Sort by cost so the frontier Line connects points in cost order.
    points.sort((a, b) => a.cost - b.cost);
    const frontierPts = points
      .filter((p) => p.isFrontier)
      .sort((a, b) => a.cost - b.cost);
    return { data: points, frontier: frontierPts };
  }, [models, lens]);

  if (!isClient) {
    return (
      <div className="h-[460px] w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
    );
  }

  const costs = data.map((d) => d.cost).filter((c) => c > 0);
  const minCost = costs.length > 0 ? Math.min(...costs) : 0.001;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 100;
  // Pad the log domain a touch so points don't sit on the axis.
  const domainMin = Math.max(minCost * 0.7, 0.0005);
  const domainMax = maxCost * 1.3;
  const xTicks = costTicks(domainMin, domainMax);

  const budgetPoint =
    budget !== null && budget > 0
      ? data
          .filter((d) => d.cost <= budget)
          .sort((a, b) => b.capability - a.capability)[0] ?? null
      : null;

  return (
    <div className="h-[460px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={360}>
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 24, left: 8, bottom: 24 }}
          onClick={(e) => {
            const slug = readClickSlug(e);
            if (slug) router.push(`/model/${slug}`);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            type="number"
            dataKey="cost"
            scale="log"
            domain={[domainMin, domainMax]}
            allowDataOverflow
            ticks={xTicks}
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickFormatter={formatCostTick}
            label={{
              value: "Cost / 1M tokens (log)",
              position: "insideBottom",
              offset: -12,
              style: { fontSize: 11, fill: "currentColor", opacity: 0.6 },
            }}
          />
          <YAxis
            type="number"
            dataKey="capability"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "currentColor" }}
            label={{
              value: `${lensLabel(lens)} capability`,
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "currentColor", opacity: 0.6 },
            }}
          />
          <ZAxis type="number" dataKey="coverage" range={[40, 220]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<ScatterTooltip />}
          />
          {/* Pareto frontier polyline, drawn behind the points. */}
          <Line
            dataKey="frontierY"
            connectNulls
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Scatter
            dataKey="capability"
            shape={(props: ScatterShapeProps) => (
              <PointShape
                {...props}
                budgetSlug={budgetPoint?.slug}
                highlightSlugs={
                  highlightSlugs ?? (highlightSlug ? [highlightSlug] : undefined)
                }
              />
            )}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {frontier.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
            Pareto frontier — no model beats these on capability at lower cost
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900" />
            frontier model
          </span>
          {budgetPoint && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Best ≤ {formatCost(budget)}: {budgetPoint.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function lensLabel(lens: LensKey): string {
  return lens === "coding" ? "Coding" : lens === "agentic" ? "Agentic" : "General";
}

function PointShape(props: ScatterShapeProps & { budgetSlug?: string; highlightSlugs?: string[] }) {
  const { cx, cy, payload, budgetSlug, highlightSlugs } = props;
  if (cx == null || cy == null || !payload) return null;
  const fill = payload.isFree ? "#22c55e" : colorFor(payload.provider);
  const r = 4 + (payload.coverage ?? 0) * 5;
  const isFrontier = payload.isFrontier;
  const isBudget = budgetSlug && payload.slug === budgetSlug;
  const isHighlight = highlightSlugs?.includes(payload.slug);
  return (
    <g>
      {isFrontier && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 3}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isBudget || isHighlight ? r + 2 : r}
        fill={fill}
        fillOpacity={isHighlight ? 1 : isFrontier ? 0.95 : 0.7}
        stroke={isBudget || isHighlight ? "#f59e0b" : "white"}
        strokeWidth={isBudget || isHighlight ? 2.5 : 1}
      />
    </g>
  );
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900/95">
      <div className="font-semibold">{p.name}</div>
      <div className="mt-1 text-neutral-600 dark:text-neutral-300">
        {p.provider} {p.isFree && "· free"}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
        <span className="text-neutral-500">Cost / 1M</span>
        <span className="text-right font-medium">{formatCost(p.cost)}</span>
        <span className="text-neutral-500">Capability</span>
        <span className="text-right font-medium">{p.capability.toFixed(1)}</span>
        <span className="text-neutral-500">Coverage</span>
        <span className="text-right">{Math.round(p.coverage * 100)}%</span>
        <span className="text-neutral-500">Efficiency</span>
        <span className="text-right">{p.efficiency.toFixed(2)}</span>
      </div>
      {p.isFrontier && (
        <div className="mt-1.5 font-medium text-amber-600 dark:text-amber-400">
          On the Pareto frontier
        </div>
      )}
    </div>
  );
}
