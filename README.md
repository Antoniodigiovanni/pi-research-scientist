# pi-research-scientist

A maintainable research-engineering package for the Pi coding agent: literature,
data documentation, reproducible experiments and evidence-based publication.
Ordinary TypeScript integrations retrieve bounded evidence; focused skills define
the research method. The project repository, not chat history, is durable memory.

## Install

Requires Node >=22.19 and current Pi. Development is pinned and tested against
`@earendil-works/pi-coding-agent@0.85.1`; older `@mariozechner` releases are unsupported.

From the supplied workspace:

```sh
cd pi-research-scientist
npm ci --ignore-scripts
cd ..
pi install npm:pi-web-access
pi install ./pi-research-scientist
```

Restart Pi or `/reload`. Review the source before trusting project packages. Pi's
project trust controls loading, not runtime isolation. No model credentials are
needed to run the default test suite or package loading smoke test.

The npm name is reserved here only as package metadata: this package has **not** been
published. Use the local install above. No postinstall or global configuration edits
are performed by our package.

## Start a project

```sh
cd pi-research-scientist
npm run init-project -- ../my-research internal "My research question"
cd ../my-research
pi
```

Use `public` instead of `internal` for open-data projects. Edit `research.yaml` before
connecting data services. The initializer refuses existing destinations, preserves
existing global instructions and makes no service calls. Review and manually merge
`templates/global/AGENTS.md` into `~/.pi/agent/AGENTS.md` if desired; keep a backup and
resolve overlaps. Pi packages do not automatically install this global fragment.

The template's `.env.example` lists variable names only. This package does not load
`.env` files automatically; provide approved credentials through your process environment.

Run `/research-doctor`, then `/new-research <idea>`. Start with discovery and a
minimum meaningful baseline. No novelty claim follows merely from an empty search.

## Architecture

```text
extensions/      research-guardrails, scholarly, zotero, databricks, mlflow
src/             strict policy, bounded HTTP/text, project initialization
skills/          focused methods with on-demand references
prompts/         short slash-command entry points
templates/       research project and global AGENTS fragment
scripts/         initializer, package validation and Pi loading checks
tests/           unit and mock HTTP tests; synthetic fixtures only
```

The explicit `package.json` Pi manifest lists five extension entry points and the
skills/prompts directories. Pi-provided imports are peer dependencies; exact dev
versions exercise compatibility. No framework or internal plugin system is used.

## Integrations

- Zotero/Better BibTeX: read-only local library tools,
  indexed paper text, annotations, local PDF extraction, optional citation exports.
- Databricks: Unity Catalog metadata and approved
  aggregate profiles using a dedicated low-privilege identity. No arbitrary SQL.
- MLflow: read-only experiment/run evidence and
  explicitly permitted artifact reads. Human experiment records remain in Git.
- Scholarly metadata: structured discovery and
  citation neighborhoods with provenance and deduplication.

`pi-web-access` is a separately installed prerequisite, never vendored or bundled.
Skills use its `web_search`, `fetch_content`, `get_search_content`, and `source_check`
interface. Synthesized answers are leads; preserve sources and passages in your
repository. Its temporary cache does not replace research records. Do not enable
hosted extraction for confidential documents or put company data into search queries.

Optional [pi-web-agent](https://github.com/demigodmode/pi-web-agent) currently exposes
`web_explore`, including targeted browser rendering. It can be useful for a difficult
JavaScript page or a separate second pass. It is not installed/activated by this
package. Prefer one general web toolset per session; add overlap only for a stated need.

## Commands and workflows

| Stage | Prompts |
|---|---|
| Discovery | `/new-research`, `/literature`, `/paper`, `/novelty` |
| Planning/data | `/sprint`, `/document-data`, `/data-audit` |
| Experiments | `/experiment`, `/review-results`, `/reproduce` |
| Publication | `/target-venue`, `/write-paper`, `/review-paper` |
| Communication | `/standup`, `/management-update`, `/decision`, `/project-status` |
| Diagnostics | `/research-doctor` (extension command) |

Prompts route to skills; they do not execute an autonomous scientific pipeline.

## Company data

Review the data boundary before configuring a company system. Internal mode denies
raw rows, samples and release by default.
Set `data_policy.approved_models` to exact approved `provider/model-id` values before
using internal data integrations; an empty list blocks those tools.
Metadata and approved aggregates still need an organizationally approved model and
data-owner review. Read-only database permission is **not** permission to send data
to an external model. Strict project flags are additional guards, not a sandbox.

Databricks permissions are authoritative. Prefer OAuth/unified authentication and a
dedicated identity with discovery-only privileges where possible. Querying requires
SELECT only on approved views/tables and CAN USE on an existing warehouse; no mutation
or admin rights. Empty scope lists grant no access. Credentials belong outside Git.

The package cannot stop built-in shell/file tools or another extension from accessing
data. Model changes, history, exports and compaction can propagate previous content.
Use OS/network isolation and organization-approved infrastructure for strong controls.

## Development and validation

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run validate
npm run smoke
npm run pack:check
npm pack --dry-run
```

Optional public-network check, using fixed public queries and no credentials:
`PI_RESEARCH_SCIENTIST_LIVE_SCHOLARLY=true npm run test:live`. Provider failures make it exit
nonzero and are reported as coverage gaps, not empty literature searches.

Mock HTTP tests require permission to bind localhost sockets. No default test requires
a real API key, Zotero library or Databricks workspace. The smoke test uses Pi's actual
resource loader in a temporary agent directory and never invokes a model.
Successful mocks do not establish compatibility with every live tenant.

## Troubleshooting, upgrade and removal

Run `/research-doctor` first. It checks project policy and local Zotero/BBT availability,
reports tool presence and configuration flags without printing secrets, and labels
remote services that have not been probed. For missing web tools install the prerequisite
and reload. For invalid YAML repair the reported policy field; never bypass the gate.
Zotero must be running with local communication enabled. `pdftotext` is optional for
PDF fallback; indexed full text needs no external executable.

Upgrade this local source, run `npm ci --ignore-scripts` and `npm run check`, then
reload Pi. Review upstream API changes and the changelog before upgrading Pi itself.
For installed packages current Pi uses `pi update --extensions`; pin versions when
repeatability matters. Remove with `pi remove /absolute/path/to/pi-research-scientist`; optionally
remove `npm:pi-web-access` separately. Project files and manually merged AGENTS rules
are intentionally retained; edit only the fragment you added if removing it.

## Limits

No requested Zotero library edits, Databricks data mutations or MLflow experiment
mutations (Zotero/BBT may still update internal caches); no infrastructure management;
no automatic Zotero additions; no promised novelty or venue acceptance; no hardcoded
venue rules. Local PDF text extraction has no OCR and may lose layout. Metadata API
coverage and publication statuses require source verification. Aggregate suppression
is not formal privacy. Published scientific figures must be regenerated from code/data.
