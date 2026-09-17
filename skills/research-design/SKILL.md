---
name: research-design
description: Turn a research idea into a scoped scientific question, contribution hypothesis, feasibility assessment, and minimal evidence plan. Use during discovery before experiment implementation.
---

# Research design

Read `research.yaml`, `docs/research-question.md`, `docs/novelty.md`, and the literature evidence matrix when present. Separate three decisions: whether the question matters, whether it is answerable with available evidence, and whether the answer could be scientifically distinct.

Write or update `docs/research-question.md` with:

- population or system, intervention/exposure, comparator, outcome, and operating conditions;
- candidate contribution and who would care;
- falsifiable hypotheses and observations that would refute each one;
- required data, likely confounders, and ethical or release constraints;
- minimum meaningful baseline and primary evaluation criterion;
- feasibility risks, including compute, access, labels, and timeline;
- candidate venue classes as planning constraints, without predicting acceptance.

Prefer a narrow question that one clean experiment can test. If the proposed work combines several independent innovations, split them into ordered hypotheses. Do not implement a complex method during discovery. Route unresolved novelty claims through `literature-review` and `novelty-analysis`, then record the resulting design choice with `decision-log`.
