---
name: experiment-design
description: Specify a falsifiable, reproducible ML/AI experiment before substantial execution. Use when creating or materially changing an experiment.
---

# Experiment design

Create `experiments/<number>-<slug>/experiment.md` before running substantial work. Base it on repository evidence and state:

- hypothesis and falsifiable prediction;
- independent variable and dependent variables;
- controls, minimum baseline, and strongest appropriate baselines;
- primary metric, secondary metrics, and why each fits the claim;
- dataset/version, population, split strategy, exclusions, and leakage risks;
- expected result and at least one plausible alternative explanation;
- uncertainty method or statistical test, its assumptions, effect size of interest, and multiple-comparison plan;
- compute, hardware/runtime, seeds, stopping criteria, and resource ceiling;
- interpretation if positive, null, negative, or operationally infeasible.

Change as few independent dimensions as practical. Predeclare the primary comparison; label later exploratory analyses. Prefer the cheapest experiment that can change the decision. Link data assessment and leakage audit when the split, target, retrieval corpus, or preprocessing changes.

Reserve fields for exact command, configuration, code revision, model/checkpoint, run tracker IDs when used, metrics, artifacts, observations, interpretation, decision, and follow-up. Use pi-workflow's MLflow skill for tracking setup. A run is not reproducible if essential state lives only in a notebook or conversation.
