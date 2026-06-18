export function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function formatScore(value: number): string {
  return value.toFixed(1);
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

// OpenRouter names are "OpenAI: GPT-5.5" — strip the provider prefix for display.
export function formatDisplayName(name: string): string {
  const idx = name.indexOf(": ");
  return idx >= 0 ? name.slice(idx + 2) : name;
}

export function formatContext(length: number | undefined): string {
  if (!length) return "—";
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(length % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(length / 1000)}k`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatFreshness(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
