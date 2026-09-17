---
name: research-presentations
description: Create evidence-grounded Markdown research presentations for either team standups or management updates. Use when communicating project progress; choose the audience-specific mode.
---

# Research presentations

Read repository evidence and choose one mode. Do not reuse the same narrative for both audiences.

## Team standup

Write Markdown under `presentations/standup/`. Cover the research question, current hypothesis, change since last update, experiments run, observed results, statistical interpretation, unexpected findings, decision, next experiment, and blockers. Include run IDs and repository links where useful. Preserve uncertainty and technical detail needed for team critique.

## Management update

Write Markdown under `presentations/management/`. Cover the problem, why it matters, progress toward the milestone, strongest evidence, business or research implication, cost/effort, major risks, decision required, and next milestone. Explain uncertainty in decision terms; omit implementation detail that does not change a decision.

Use simple Markdown compatible with a documented renderer such as Marp or Quarto when available. Keep each slide focused on one decision or finding. Every number and claim must trace to an experiment, decision, literature note, or data record. Do not add a finding because it makes a stronger slide. Keep rendering optional and maintainable; the Markdown source is canonical.
