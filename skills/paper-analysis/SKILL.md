---
name: paper-analysis
description: Analyze one research paper from Zotero, a local PDF, or an authoritative source into a structured permanent note. Use for close reading, citekey analysis, or deciding how a paper affects the project.
---

# Paper analysis

Resolve the paper by Zotero citekey/identifier when possible. Read in this order: metadata, existing notes and annotations, indexed full text, then bounded local PDF extraction for gaps. Do not upload Zotero PDFs to external extraction services. Record whether analysis used full text, partial text, abstract, or snippets.

Create `literature/papers/<citekey-or-stable-id>.md` with metadata and source links, then analyze:

- research question, central claim, method, data, baselines, metrics, ablations, and main numerical results;
- assumptions, limitations, reproducibility requirements, unanswered questions, and future work;
- evidence supporting the central claim and evidence that would falsify it;
- whether experiments support the wording of the claim and important alternative explanations;
- the most decision-relevant result, components worth reproducing, and what the work should be cited for specifically.

Quote sparingly and preserve page, section, table, or figure locators for important evidence. Do not infer absent experimental details. Separate authors' claims from your assessment.

End every note exactly with an `## Impact on current project` section containing: Supports, Contradicts, Changes, Opens, Should reproduce, Should cite, and Confidence/uncertainty. Add or update the corresponding evidence-matrix row without erasing previous search provenance.
