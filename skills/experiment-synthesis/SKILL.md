---
name: experiment-synthesis
description: Combine evidence across experiments into a decision without hiding contradictions, heterogeneity, or failed runs. Use when several experiment records bear on one hypothesis or claim.
---

# Experiment synthesis

Define the claim or decision being synthesized and list every relevant experiment, including failed, null, and superseded runs. Exclude a run only for a documented validity reason.

Build a compact evidence table with experiment path, design difference, dataset/snapshot, comparator, effect estimate, uncertainty, validity concerns, compute cost, and direction relative to the claim. Determine whether results are directly comparable before pooling them. Do not average metrics across different populations, splits, or definitions merely because column names match.

Explain consistency, heterogeneity, and contradictions. Separate:

- repeated observations;
- statistical support under the registered designs;
- causal or mechanistic interpretation;
- unresolved speculation.

Assess whether the aggregate evidence changes the hypothesis, proposed contribution, claim strength, or next sprint. If a quantitative combination is warranted, state the estimand and weighting model; otherwise use a structured qualitative synthesis. Update `paper/claims.md` only with the defensible strength and limitations, and write a decision record for material changes.
