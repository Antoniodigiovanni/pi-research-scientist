---
name: internal-data-safety
description: Enforce the confidential-data boundary for internal research projects and review a planned data interaction. Use before Databricks access, profiling, sampling, export, or release involving company data.
---

# Internal data safety

Treat Databricks read permission and permission to send data to a model as separate decisions. Read `research.yaml`; fail closed if it is absent, malformed, or ambiguous.

For `internal` projects, the baseline is metadata and approved non-sensitive aggregates only. Raw rows, samples, sensitive values, external release, and public release remain denied until their exact policy gates are explicitly enabled. A repository flag cannot grant Databricks permission or override organizational policy.

Before a data action:

1. Classify the requested output as metadata, aggregate, sample, raw row, artifact, or release.
2. Check the corresponding project policy and sensitive-data tags. Use the more restrictive result when they disagree.
3. Confirm the Databricks identity is dedicated, low privilege, read-only, scoped to allowed catalogs/schemas, and lacks mutation/admin permissions.
4. Minimize columns, population, precision, and output size. Avoid categorical top values when they could identify people or rare groups.
5. Keep credentials out of commands, logs, errors, fixtures, notes, and version control.

Before web or scholarly API calls, sanitize queries. Internal project names, table/schema/catalog names, non-public product details, confidential hypotheses, measurements, and identifiers must not be sent to external search providers unless a documented organizational approval covers that exact disclosure. A project flag allowing metadata or aggregates is not such approval.

Prompt instructions and SQL classification are defense in depth, not a security sandbox. If provider/model allowlisting cannot be verified through Pi's current API, state that limitation before any permitted row-returning action. Record policy exceptions and their owner in `docs/decisions/`.
