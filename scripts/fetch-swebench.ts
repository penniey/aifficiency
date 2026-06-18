import { writeFileSync } from "fs";
import { join } from "path";

// Fetches the SWE-bench Verified leaderboard and keeps the bash-only /
// mini-SWE-agent view (LM-only, apples-to-apples across models — no agentic
// scaffolding). The data lives in the swe-bench.github.io GitHub Pages repo.
//
// Source: https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json
// We filter leaderboards[name='bash-only'].results[] and emit {name, resolved,
// date, mini_swe_agent_version} per model.

const OUT = join(process.cwd(), "data", "raw", "swebench.json");
const URL =
  "https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json";

type Result = {
  name: string;
  resolved: number;
  date?: string;
  mini_swe_agent_version?: string;
};
type Leaderboard = { name: string; results: Result[] };
type Payload = { leaderboards: Leaderboard[] };

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`SWE-bench fetch failed: ${res.status} ${res.statusText}`);
  const payload = (await res.json()) as Payload;

  const bash = payload.leaderboards.find((l) => l.name === "bash-only");
  if (!bash) {
    console.error("bash-only leaderboard not found in payload");
    process.exit(1);
  }

  const rows = bash.results.map((r) => ({
    name: r.name,
    resolved: r.resolved,
    date: r.date,
    mini_swe_agent_version: r.mini_swe_agent_version,
  }));

  writeFileSync(OUT, JSON.stringify(rows, null, 2));
  console.log(`SWE-bench: ${rows.length} bash-only models -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
