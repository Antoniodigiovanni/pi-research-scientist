---
name: latex-authoring
description: Draft or revise an evidence-driven research paper in LaTeX using repository claims, experiments, figures, and verified citations. Use for manuscript and supplementary-material work.
---

# LaTeX authoring

Read `paper/claims.md`, experiment records, novelty analysis, venue requirements, and citation-verification status before drafting. Every major empirical claim must map to experiment evidence, a figure/table where useful, citations, confidence, and limitations.

Maintain a conventional scientific structure when appropriate: abstract, introduction, related work, methodology, experimental setup, results, discussion, limitations, conclusion, and supplementary material. Adapt to the current verified venue instructions rather than hardcoding section names or limits.

Write concise prose. Separate observations from interpretation, qualify conclusions to the studied setting, and keep limitations adjacent to claims they constrain. Do not strengthen a sentence beyond its evidence to improve the narrative. Use stable citation keys from `paper/references.bib`; do not invent metadata or manually type scientific values that can be generated from experiment outputs.

Keep custom LaTeX commands small and legible. Place reusable figure/table generation in code, and link generated artifacts to their source. Compile when a TeX toolchain is available, inspect warnings and references, and report when compilation was not run. Update `paper/claims.md` as claims change.
