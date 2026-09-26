---
name: literature-review
description: Conduct a traceable multi-source literature review and maintain the search log and evidence matrix. Use for a new research question, related-work update, or targeted search for novelty-invalidating work.
---

# Literature review

Read `research.yaml` and `docs/research-question.md`. Preserve intermediate evidence in `literature/search-log.md` and `literature/evidence-matrix.csv`; a synthesized web answer is only a lead.

Before any external search in an internal project, remove company names, internal data identifiers, unreleased product details, confidential measurements, internal identifiers, and non-public hypotheses. Search a sanitized public formulation, or use only an externally approved query recorded in a decision. Project policy that allows aggregates is not permission to disclose it to a search provider. When safe sanitization would change the scientific meaning, stop external search and document the restricted search gap.

## Search

Use the separately installed `pi-web-access` tools for generic web evidence and the scholarly extension for structured records. Read [the verified pi-web-access interface](references/pi-web-access.md) when constructing calls. Search multiple formulations across journals, conferences, accepted drafts, OpenReview, preprints, workshops, technical reports, credible research/engineering blogs, benchmark papers, venues, and author pages. Include recency searches and citation/reference neighborhoods of the closest works.

Run explicit falsification queries: name the candidate contribution and search for work that already performs it, produces the same result under another name, or makes the question uninteresting. Follow cited and citing works until new queries mostly repeat known candidates or until the time/search budget is reached. Record the stopping reason.

Append each query with timestamp, question, provider, exact query, filters, rationale, key results, and follow-ups. Normalize each serious candidate into the evidence matrix. Deduplicate by DOI, then arXiv/OpenReview identifier, then normalized title and authors. Preserve publication status; do not equate a preprint, submission, and peer-reviewed paper.

Read primary sources for consequential claims. Label snippet-only, abstract-only, full-text, and independently reproduced evidence. Finish with the closest work, disagreements, uncovered regions, and next searches. Never claim that no prior work exists. State the scope: “Within the searches and citation neighborhoods examined so far…”
