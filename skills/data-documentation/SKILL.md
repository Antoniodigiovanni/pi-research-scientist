---
name: data-documentation
description: Produce durable dataset and lineage documentation from Unity Catalog metadata, repository transformations, and approved aggregate evidence. Use when documenting inputs, intermediates, or final analytical datasets.
---

# Data documentation

Read `research.yaml` before querying any data service. For internal projects, use Unity Catalog metadata and explicitly approved aggregate profiling; do not retrieve rows to improve documentation.

Maintain separate records for input sources, transformations/intermediates, and final analytical or model datasets. Update the files under `docs/data/` with:

- purpose, source tables, owners, snapshot/version, and temporal coverage;
- schema, column meanings, comments, tags/classification, and sensitive fields;
- observed missingness and quality issues from approved aggregates;
- exclusions, filters, transformations, labels/targets, and split construction;
- leakage risks and safeguards;
- upstream lineage and downstream outputs in plain language;
- reproduction steps and release/publication constraints.

Use stable fully qualified table names and link code/configuration that creates derived data. Mark inference as inference when metadata is incomplete. Record query time and source of each important fact. Never copy raw sensitive values into documentation. Keep `sources.md`, `variables.md`, `transformations.md`, `lineage.md`, and `final-datasets.md` mutually consistent and understandable without model context.
