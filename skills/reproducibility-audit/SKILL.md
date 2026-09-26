---
name: reproducibility-audit
description: Audit whether another researcher can recreate an ML/AI result from repository records and available dependencies. Use before milestone decisions, release, or submission.
---

# Reproducibility audit

Select one claimed result and attempt to trace it from claim to experiment, command, code revision, configuration, data snapshot, run, metric, and final table/figure.

Check environment and package versions; seeds and nondeterminism; data identifiers and access; preprocessing; split construction; model/checkpoint versions; hardware/runtime; exact commands; configuration; run tracker IDs and artifacts when used; evaluation code; figure/table generation; and proprietary or unavailable dependencies.

Notebooks may explore or visualize, but reusable logic must live in ordinary modules. Flag hidden notebook state, manual number copying, untracked data mutation, ambiguous “latest” resources, and artifacts that cannot be regenerated.

Write a report with tested scope, successful reconstruction steps, deviations, missing inputs, expected versus observed outputs, and severity. Distinguish computational repeatability, independent reproducibility, and external replicability. For confidential data, document access requirements and safe substitutes without exposing data. Recommend the smallest fixes that make the evidence chain executable, then rerun the affected step rather than declaring success from documentation alone.
