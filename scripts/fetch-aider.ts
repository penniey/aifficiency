import { writeFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

// Fetches the Aider polyglot coding leaderboard (225 Exercism exercises across
// 6 languages). The source of truth is a Jekyll _data YAML file in the
// Aider-AI/aider repo.
//
// Source: https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml
// We emit {model, pass_rate_2, date, reasoning_effort, total_cost, edit_format}
// per row. Multiple rows per model (different efforts/thinking) are kept; the
// merge step picks the best as the canonical score and stores the rest as variants.

const OUT = join(process.cwd(), "data", "raw", "aider.json");
const URL =
  "https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml";

type Row = {
  model: string;
  pass_rate_2: number;
  date?: string;
  reasoning_effort?: string;
  total_cost?: number;
  edit_format?: string;
};

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Aider fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const parsed = yaml.load(text) as unknown;
  if (!Array.isArray(parsed)) {
    console.error("Aider YAML did not parse to an array");
    process.exit(1);
  }

  const rows: Row[] = parsed
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      model: String(e.model ?? ""),
      pass_rate_2: Number(e.pass_rate_2 ?? 0),
      ...(e.date ? { date: String(e.date) } : {}),
      ...(e.reasoning_effort ? { reasoning_effort: String(e.reasoning_effort) } : {}),
      ...(typeof e.total_cost === "number" ? { total_cost: e.total_cost } : {}),
      ...(e.edit_format ? { edit_format: String(e.edit_format) } : {}),
    }))
    .filter((r) => r.model && Number.isFinite(r.pass_rate_2));

  writeFileSync(OUT, JSON.stringify(rows, null, 2));
  console.log(`Aider: ${rows.length} rows -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
