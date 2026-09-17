---
name: data-leakage-audit
description: Audit an ML/AI dataset and pipeline for train-test, temporal, target, entity, duplicate, benchmark, retrieval, and LLM contamination. Use before trusting baseline or contribution results.
---

# Data leakage audit

Trace each feature, label, retrieved item, preprocessing fit, and split key from source time to evaluation. Inspect code and metadata; do not rely on split names.

Assess:

- train/validation/test overlap and near duplicates;
- time ordering, delayed labels, and future-derived features;
- direct or proxy target leakage;
- users, entities, groups, documents, and repeated events crossing splits;
- preprocessing, vocabulary, imputation, selection, and calibration fit on evaluation data;
- benchmark test exposure and tuning against public leaderboards;
- LLM pretraining or instruction-data contamination when relevant;
- retrieval indexes containing answer, label, test, or post-outcome material;
- label construction and human annotation paths that reveal evaluation information.

Write an audit report under `docs/data/` with scope, evidence inspected, checks performed, finding severity, affected experiments/claims, and remediation. Classify findings as blocking, material, minor, or unverified. Include executable or reproducible checks when practical. Absence of detected duplicates is not proof of no contamination; state coverage and blind spots.
