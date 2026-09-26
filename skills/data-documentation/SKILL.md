---
name: data-documentation
description: Document research datasets, provenance, population, variables, and limitations needed to interpret experiments and claims.
---

# Data documentation

Read `research.yaml` before accessing internal sources. Use pi-workflow's data-engineering and service skills for technical schema, transformation, and lineage inspection. Record only evidence approved for the research project.

Maintain separate records for input sources, transformations/intermediates, and final analytical or model datasets. Update the files under `docs/data/` with:

- purpose, source tables, owners, snapshot/version, and temporal coverage;
- schema, column meanings, comments, tags/classification, and sensitive fields;
- observed missingness and quality issues from approved aggregates;
- exclusions, filters, transformations, labels/targets, and split construction;
- leakage risks and safeguards;
- upstream lineage and downstream outputs in plain language;
- reproduction steps and release/publication constraints.

Use stable dataset identifiers and link the code or configuration that creates derived data. Mark inference as inference when metadata is incomplete. Record retrieval time and source of each important fact. Never copy raw sensitive values into documentation. Keep `sources.md`, `variables.md`, `transformations.md`, `lineage.md`, and `final-datasets.md` mutually consistent and understandable without model context.
