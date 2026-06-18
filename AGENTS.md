<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Commands

- `npm run lint` — eslint
- `npm run test` — vitest run (scoring tests in `src/lib/efficiency.test.ts`)
- `npx tsc --noEmit` — typecheck
- `npm run build` — production build
- `npm run update:data` — fetch OpenRouter + SWE-bench + Aider and merge into `data/models.json`

# Data model

- `src/lib/types.ts` is the single source of truth for the schema. Scoring lives in `src/lib/efficiency.ts` (pure functions: `computeBlendedCost`, `normalizeBenchmark`, `computeLensCapability`, `computeFrontier`, `computeEfficiency`, `scoreModels`, `rescoreWithCost`).
- Capability is cost-independent and precomputed server-side; efficiency/Pareto/rank depend on blended cost and are recomputed client-side in `ExploreView` via `rescoreWithCost` when sliders move.
- Benchmarks use fixed ceilings (`data/config.json`), not raw max, so scores stay stable as new models arrive.

