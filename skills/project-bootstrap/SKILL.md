---
name: project-bootstrap
description: Initialize a pi-research-scientist project from the packaged template and establish its public or internal data policy. Use when starting a research project or repairing a missing project structure.
---

# Project bootstrap

Create the smallest durable project record before analysis or implementation.

1. Confirm that the current directory is the intended project root. Do not overwrite existing files. Use the package's documented initializer or copy `templates/research-project/` while preserving existing work.
2. Set `project.name`, `project.type`, `project.research_question`, and `project.owner` in `research.yaml`. Choose `internal` whenever company or restricted data may be involved. Never infer a switch from `internal` to `public`.
3. Review every `data_policy` field. Keep internal defaults unless a named owner has approved a narrower exception. Record that approval in `docs/decisions/`.
4. Fill `docs/research-question.md` with the decision, population or setting, measurable outcome, scope, and a falsifiable initial hypothesis. Mark unknowns rather than inventing facts.
5. Set Sprint 0 as the current sprint and create its decision record. Identify the minimum literature, data-feasibility, and baseline evidence needed to move to Sprint 1.

Keep secrets outside the repository. For an internal project, run the `internal-data-safety` skill before connecting data services. Finish by reporting created, preserved, and still-unconfigured files.
