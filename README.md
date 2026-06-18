# AIfficiency

Plot every AI coding model on **intelligence vs cost**, see the Pareto frontier,
and find the most capability for your budget.

Data is pulled automatically from OpenRouter (pricing + Design Arena Elo),
SWE-bench Verified (bash-only / mini-SWE-agent), and the Aider polyglot
leaderboard. **This is a non-commercial project.** See
[THIRD_PARTY.md](./THIRD_PARTY.md) and the in-app
[/sources](./src/app/sources/page.tsx) page for full data-source attribution and
licenses.

## How it works

- **Cost** is a workload-blended $/1M tokens (default 30% prompt / 70%
  completion, adjustable). Free models sit at the far left of the cost axis.
- **Capability** is a coverage-penalized weighted average of benchmarks, per
  lens:
  - **Coding** — SWE-bench Verified, Aider Polyglot, Arena (coding)
  - **Agentic** — SWE-bench, Aider, Arena (coding)
  - **General** — Arena (overall), SWE-bench, Aider
- **Efficiency** is capability per log-dollar, used for sorting.
- **Pareto frontier** marks models no other model beats on capability at lower
  cost — the actual efficient set. Dominated models show how many capability
  points they sit below the frontier at their price.

The explore view recomputes cost-dependent scores live as you move the prompt
share, toggle cache savings, switch lenses, filter providers, or set a budget.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run test         # vitest
npm run build
```

## Refreshing data

```bash
npm run update:data  # fetch:openrouter + fetch:swebench + fetch:aider + merge
```

Outputs `data/models.json` (the ranked dataset), `data/pricing.json`,
`data/meta.json` (freshness + unmatched report), and raw payloads under
`data/raw/`. A daily GitHub Action (`.github/workflows/update-data.yml`) runs
this and commits the result.

### Sources

| Source | What it provides | License | Endpoint |
| --- | --- | --- | --- |
| OpenRouter | Pricing, context, modalities, relayed Design Arena Elo | OpenRouter ToS | `https://openrouter.ai/api/v1/models` |
| SWE-bench Verified | LM-only (bash-only) resolved % | CC BY-NC 4.0 | `raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json` |
| Aider Polyglot | pass_rate_2 % (225 exercises) | Apache-2.0 | `raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml` |
| LM Arena | Design Arena Elo (via OpenRouter) | Relayed via OpenRouter | `https://lmarena.ai/` |

Full per-source attribution, fetch timestamps, and license notes live in
[THIRD_PARTY.md](./THIRD_PARTY.md) and the in-app
[/sources](./src/app/sources/page.tsx) page. Artificial Analysis indices are
**intentionally excluded** (commercial benchmark product).

Supplemental model names are resolved to OpenRouter ids in
`scripts/lib/match.ts` (normalization + a curated alias table + a guarded
substring fallback). Unmatched names are logged to `data/meta.json` so the
alias table can be grown over time.

## Project layout

```
scripts/
  fetch-openrouter.ts   # pricing + OR-native benchmarks
  fetch-swebench.ts     # SWE-bench Verified (bash-only)
  fetch-aider.ts        # Aider polyglot
  merge.ts              # builds data/models.json + data/meta.json
  lib/match.ts          # supplemental name -> OpenRouter id resolution
src/lib/
  types.ts              # schema (Model, RankedModel, AppConfig, lenses)
  efficiency.ts         # cost, normalization, capability, Pareto, efficiency
  data.ts               # load models / config / meta
src/components/
  ExploreView.tsx       # stateful explore (filters -> rescore -> scatter + table)
  ScatterPlot.tsx       # capability vs cost (log) with Pareto frontier
  ExploreControls.tsx   # lens tabs, sliders, budget, filters
  RankingsTable.tsx     # sortable table
```
