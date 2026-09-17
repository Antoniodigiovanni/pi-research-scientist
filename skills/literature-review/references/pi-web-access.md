# pi-web-access interface

Verified against the upstream [pi-web-access README](https://github.com/nicobailon/pi-web-access#readme) on 2026-09-16. The package is installed separately with `pi install npm:pi-web-access`. Tool names can be overridden in its configuration, so inspect available tools when these defaults are absent.

## Search

Default tool: `web_search`.

```text
web_search({ query: "one query" })
web_search({ queries: ["query one", "query two", "query three"], workflow: "none" })
web_search({ query: "recent topic", numResults: 10, recencyFilter: "year" })
web_search({ query: "venue topic", domainFilter: ["openreview.net", "-example.com"] })
web_search({ query: "topic", includeContent: true })
```

Use `query` or `queries`; batch search runs up to three queries concurrently. `numResults` defaults to 5 and is capped at 20. `recencyFilter` accepts `day`, `week`, `month`, or `year`. `domainFilter` includes named domains and excludes entries prefixed with `-`. Prefer `workflow: "none"` when preserving raw intermediate evidence; an auto-generated summary is not a literature review.

## Fetch and bounded retrieval

Default tools: `fetch_content` and `get_search_content`.

```text
fetch_content({ url: "https://example.org/paper" })
fetch_content({ urls: ["url1", "url2"] })
get_search_content({ responseId: "response-id", urlIndex: 0, findText: "limitations" })
get_search_content({ responseId: "response-id", urlIndex: 0, offset: 30000, limit: 10000 })
```

Use `findText` for bounded passages or `offset` plus `limit` for intentional paging. Do not combine `findText` with offsets. Fetched source content is cached temporarily by pi-web-access; permanent conclusions still belong in repository artifacts.

For a Zotero PDF, use Zotero indexed full text or local extraction. Do not route confidential or locally stored Zotero papers through optional hosted PDF extraction providers.

## Claim evidence

Default tool: `source_check`.

```text
source_check({
  claim: "A precise claim to verify",
  queries: ["supporting query", "contradicting query"],
  fetchContent: true,
  domainFilter: ["authoritative.example"]
})
```

The artifact preserves passages and may report `supported`, `contradicted`, `unclear`, or `missing-evidence`, but retrieved passages still require manual semantic review. Retrieve paged artifacts with `get_search_content`.
