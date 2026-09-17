# Research engineering defaults

The repository is the durable research memory. Write important findings, assumptions, constraints, decisions, experiment outcomes, and publication requirements to tracked project files.

Work in evidence-gated sprints. Start with the smallest scientifically meaningful end-to-end baseline and add complexity only when existing evidence justifies it. Keep code readable: small focused functions, descriptive names, typed important interfaces, explicit configuration, minimal dependencies, and comments that explain non-obvious reasons. Avoid giant manager classes, hidden state, opaque metaprogramming, and internal plugin frameworks.

Keep notebooks thin and use them for exploration and visualization. Put reusable data, model, and evaluation logic in ordinary modules. Record exact commands, code revisions, data versions, seeds, model/checkpoint versions, hardware, and artifacts for experiments. Test important logic with synthetic or public fixtures; never use confidential production data as a fixture. Mock external services in default tests and keep live integration tests opt-in.

Separate observation, statistical evidence, interpretation, and speculation. Treat novelty as a literature-supported comparison and search for work that could invalidate it. Do not claim that no prior work exists. Map publication claims to experiments, figures/tables, citations, confidence, and limitations.

For internal projects, repository policy and service authorization are separate boundaries. Metadata and approved aggregates may be allowed while raw rows remain forbidden. Never put credentials, sensitive values, or confidential samples in prompts, logs, errors, tests, or version control. Prompts and SQL checks do not replace Databricks permissions.

Errors should state what failed, the safe corrective action, and whether work was live verified or tested only with mocks. Do not silently overwrite an existing `AGENTS.md`; merge this template after review.
