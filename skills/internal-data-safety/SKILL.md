---
name: internal-data-safety
description: Review confidential research inputs, model exposure, external searches, and publication release before using company data.
---

# Internal data safety

Treat permission to access a source and permission to send its contents to a model as separate decisions. Read `research.yaml`; fail closed if it is absent, malformed, or ambiguous. Use pi-workflow's security and service skills for technical access controls.

For `internal` projects, raw rows, samples, sensitive values, external release, and public release remain denied until their exact policy gates are explicitly enabled. A repository flag cannot grant service permission or override organizational policy.

Before a data action:

1. Classify the requested output as metadata, aggregate, sample, raw row, artifact, or release.
2. Check the corresponding project policy and sensitive-data tags. Use the more restrictive result when they disagree.
3. Confirm the source's authorization and the approved model or publication destination with the owner. Apply service-specific controls through pi-workflow.
4. Minimize columns, population, precision, and output size. Avoid categorical top values when they could identify people or rare groups.
5. Keep credentials out of commands, logs, errors, fixtures, notes, and version control.

Before web or scholarly API calls, sanitize queries. Internal project names, data source identifiers, non-public product details, confidential hypotheses, measurements, and identifiers must not be sent to external search providers unless a documented organizational approval covers that exact disclosure. A project flag allowing aggregates is not such approval.

If provider/model allowlisting cannot be verified through Pi's current API, state that limitation before any permitted private-data action. Record policy exceptions and their owner in `docs/decisions/`.
