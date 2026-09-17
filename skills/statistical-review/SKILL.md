---
name: statistical-review
description: Review an experiment's uncertainty, effect sizes, tests, multiplicity, calibration, and reporting choices. Use when statistical evidence supports a research claim or decision.
---

# Statistical review

Start with the estimand and data-generating unit. Identify what is independent: examples, users, documents, tasks, seeds, sites, or time periods. A large number of predictions does not replace independent experimental replications.

Review:

- primary outcome and direction chosen before inspection;
- effect size in domain units and practical relevance;
- uncertainty intervals and variance across seeds or samples;
- pairing, clustering, repeated measures, dependence, and distributional assumptions;
- test fit to the design, sample size, and missing data mechanism;
- multiple comparisons and exploratory subgroup selection;
- class imbalance, threshold selection, calibration, robustness, and computational cost where relevant.

Choose a test only when it answers the estimand under defensible assumptions. Prefer intervals and effect sizes over significance alone. If assumptions are weak, use an appropriate resampling, hierarchical, robust, or descriptive approach and explain its limits. Do not retroactively redefine the primary metric without labeling the analysis exploratory.

Report what the analysis supports, does not support, and cannot distinguish. Recommend the smallest design correction or additional replication needed for a decision.
