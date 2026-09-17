---
name: dataset-assessment
description: Assess a candidate public or internal dataset for scientific fitness, provenance, leakage, licensing, representativeness, and reproducibility. Use before adopting data for research.
---

# Dataset assessment

Start from the canonical source and dataset paper, not an arbitrary mirror. For internal data, first follow `internal-data-safety`; use metadata and approved aggregates by default.

Create a dataset assessment under `docs/data/` that records:

- purpose, provenance, owner, original source, canonical paper, and acquisition date;
- version or snapshot and checksums where practical;
- license, permitted research use, redistribution, publication, and retention constraints;
- unit of observation, sampling frame, coverage, labels, splits, and preprocessing;
- missingness, known quality issues, duplicates, exclusions, and benchmark caveats;
- representativeness, affected groups, ethical concerns, and foreseeable misuse;
- temporal, entity, target, duplicate, benchmark, retrieval, and preprocessing leakage risks;
- reproducibility dependencies and what would prevent another researcher from obtaining equivalent data.

Distinguish verified facts, measurements, maintainer claims, and assumptions. Conclude with adopt, adopt with controls, pilot only, or reject; give evidence and revisit conditions. Do not treat popularity as proof that the dataset fits the research question.
