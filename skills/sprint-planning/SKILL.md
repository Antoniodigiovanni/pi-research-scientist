---
name: sprint-planning
description: Plan and close incremental research sprints with explicit evidence gates and decision records. Use when choosing the next research increment or reviewing a completed sprint.
---

# Sprint planning

Use the project stage as an evidence gate:

- Sprint 0, discovery: question, literature map, competing work, feasibility, risks, venue classes, minimum baseline, hypotheses.
- Sprint 1, baseline: one reproducible end-to-end pipeline and simple baseline.
- Sprint 2, validity: strong baselines, splits, leakage checks, controls, uncertainty, and confounders.
- Sprint 3, contribution: test the novel mechanism while changing as few dimensions as practical.
- Sprint 4, evidence: ablations, sensitivity, robustness, subgroup/error analysis, alternatives, and cost.
- Sprint 5, publication: evidence map, manuscript, figures, supplement, citation check, peer review, and venue compliance.

Inspect repository evidence before planning. Define a sprint goal, entry evidence, concrete outputs, acceptance checks, risks, and explicit deferrals. Do not advance solely because tasks were completed; advance when the scientific gate is met.

At closure, add a dated record under `docs/decisions/` stating: what we believed, what we tested, what happened, what we learned, what changed, and what comes next. Update `research.current_sprint` and `research.status` only after the record exists. Keep the next sprint smaller when a failed assumption changes the design.
