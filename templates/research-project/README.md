# Research project

This project uses pi-research-scientist conventions. Start by editing `research.yaml` and `docs/research-question.md`, then run `/new-research <idea>` or `/sprint` in Pi.

The default project mode is `internal`, with raw rows, samples, sensitive values, and release disabled. Change policy only through a documented owner decision. Keep secrets in an untracked `.env` or the platform credential chain.

Configure exact `data_policy.approved_models` before internal tool access. `.env` is
not automatically loaded; use your shell or an approved environment manager.
`gitignore.template` is renamed to `.gitignore` by the initializer (rename it manually
if copying this template). Internal Zotero reads require raw-content approval; prefer
a separate public project and library for public literature.

Canonical records live in `literature/`, `docs/data/`, `experiments/`, and `paper/claims.md`. Notebooks are for exploration; reusable logic belongs in `src/`. Default tests must use synthetic or public fixtures.
