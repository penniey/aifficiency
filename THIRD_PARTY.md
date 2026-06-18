# Third-party data & licenses

AIfficiency aggregates data from the following third-party sources. Each source
retains its own license; this document records what we use, where we get it, and
the applicable license. This is a non-commercial project — no advertising, paid
tiers, or revenue.

## OpenRouter — pricing & model metadata

- **What we use:** per-token pricing (prompt, completion, cache read/write, web
  search), context length, input/output modalities, reasoning flag, knowledge
  cutoff. We also read the `design_arena` benchmark field OpenRouter embeds.
- **Endpoint:** `https://openrouter.ai/api/v1/models` (public models API).
- **License / terms:** OpenRouter Terms of Service
  (https://openrouter.ai/terms). We fetch the public models endpoint, which is
  intended for programmatic use; we do not scrape the website or resell API
  access.
- **Attribution:** Pricing and model metadata © OpenRouter, Inc.

## SWE-bench Verified — coding benchmark

- **What we use:** resolved % on the **bash-only / mini-SWE-agent** view of
  SWE-bench Verified (500 human-validated instances; LM-only, apples-to-apples
  with no agentic scaffolding). We map each leaderboard row to an OpenRouter
  model id.
- **Source file:** `data/leaderboards.json` in
  https://github.com/swe-bench/swe-bench.github.io (fetched via
  `raw.githubusercontent.com`).
- **License:** **Creative Commons Attribution-NonCommercial 4.0 International
  (CC BY-NC 4.0)** — https://creativecommons.org/licenses/by-nc/4.0/
- **Obligations we honour:** attribution, a link to the license, and a notice
  that the data is licensed CC BY-NC. **No commercial use** is made of this
  data. The AIfficiency project itself is non-commercial.

## Aider Polyglot Leaderboard — coding benchmark

- **What we use:** `pass_rate_2` (percent correct) across 225 Exercism coding
  exercises in C++, Go, Java, JavaScript, Python, and Rust. We keep all
  effort/thinking variants per model and surface them on the model page.
- **Source file:** `aider/website/_data/polyglot_leaderboard.yml` in
  https://github.com/Aider-AI/aider (fetched via `raw.githubusercontent.com`).
- **License:** **Apache License 2.0** — https://www.apache.org/licenses/LICENSE-2.0
- **Obligations we honour:** attribution, retention of the NOTICE, and a copy of
  the Apache-2.0 license terms (the data is redistributable, including
  commercially, under Apache-2.0; AIfficiency remains non-commercial by choice).

## LM Arena / Design Arena — Elo ratings

- **What we use:** per-category Elo from crowdsourced blind votes (coding,
  fullstack, webapps, mobile, etc.). We normalize coding-relevant categories
  into "Arena (Coding)" and all categories into "Arena (Overall)".
- **How we get it:** relayed through OpenRouter's `/v1/models` API
  (`benchmarks.design_arena`). We do **not** scrape lmarena.ai (their ToS
  prohibits automated querying of their site).
- **License / terms:** Elo data is relayed via OpenRouter; attributed to LM
  Arena (https://lmarena.ai/). Crowdsourced-vote Elo is treated as factual
  data; the AIfficiency project is non-commercial.

## Notes on data handling

- Benchmark scores are normalized against fixed ceilings
  (`data/config.json`), not raw maxima, so a model's normalized score stays
  stable as new models arrive.
- All raw fetches are timestamped and recorded in `data/meta.json`
  (`fetchedAt`, source URLs, row counts, and unmatched supplemental names).
- A daily GitHub Action (`.github/workflows/update-data.yml`) refreshes the
  data and commits the result.

## Previously considered and intentionally excluded

- **Artificial Analysis indices** (`intelligence_index`, `coding_index`,
  `agentic_index`) were removed from this project. They are a commercial
  third-party benchmark product (sold via premium plans at
  https://artificialanalysis.ai/), and republishing them — even on a
  non-commercial site — risks undermining that paid offering. We do not
  display them.

---

If you are a data source owner and believe anything here is misattributed or
should be handled differently, please open an issue.
