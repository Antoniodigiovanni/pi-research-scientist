---
name: decision-log
description: Record an important research, data, experiment, or publication decision as a durable repository document. Use when evidence changes direction or a consequential choice is made.
---

# Decision log

Create a numbered, dated Markdown file under `docs/decisions/`, using a short descriptive slug. Do not use the conversation as the only record.

Include:

- **Status and date:** proposed, accepted, superseded, or rejected.
- **Context:** the decision boundary and why it matters now.
- **Evidence:** repository paths, run IDs, literature identifiers, measurements, and known uncertainty.
- **Alternatives:** credible choices considered, including keeping the current approach.
- **Decision and rationale:** what changes and why this evidence supports it.
- **Consequences:** expected benefits, costs, risks, compatibility, and follow-up work.
- **Revisit when:** concrete observations or assumptions that would reopen the decision.

Distinguish observation from interpretation. Link prior decisions when superseding them; do not rewrite accepted historical records to make later choices look inevitable. Update indexes or project status that depend on the decision, but avoid recording routine implementation details with no lasting research consequence.
