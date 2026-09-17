import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ArxivClient, parseArxivFeed } from "../extensions/scholarly/arxiv.ts";
import { CrossrefClient, normalizeCrossrefWork } from "../extensions/scholarly/crossref.ts";
import { deduplicateRecords } from "../extensions/scholarly/dedupe.ts";
import { OpenAlexClient } from "../extensions/scholarly/openalex.ts";
import { OpenReviewClient } from "../extensions/scholarly/openreview.ts";
import { SemanticScholarClient } from "../extensions/scholarly/semantic-scholar.ts";
import type { ScholarlyRecord } from "../extensions/scholarly/types.ts";
import { runSyntheticLiteratureDemo } from "../scripts/literature-demo.ts";

const arxivFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults><opensearch:startIndex>0</opensearch:startIndex>
  <entry><id>http://arxiv.org/abs/2501.01234v2</id><updated>2025-02-03T00:00:00Z</updated><published>2025-01-03T00:00:00Z</published>
    <title>A &amp; B: robust models</title><summary>  A bounded abstract. </summary>
    <author><name>Ada Example</name></author><author><name>Lin Sample</name></author>
    <arxiv:doi>10.1234/ROBUST.1</arxiv:doi><arxiv:journal_ref>Journal of Fixtures 4 (2025)</arxiv:journal_ref>
    <link href="https://arxiv.org/abs/2501.01234" rel="alternate" type="text/html" />
  </entry>
</feed>`;

async function withServer(
	handler: (request: IncomingMessage, response: ServerResponse) => void,
	run: (baseUrl: string) => Promise<void>,
): Promise<void> {
	const server = createServer(handler);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const address = server.address();
		if (!address || typeof address === "string") throw new Error("Mock server did not bind a TCP port.");
		await run(`http://127.0.0.1:${address.port}`);
	} finally {
		await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	}
}

function json(response: ServerResponse, value: unknown): void {
	response.setHeader("content-type", "application/json");
	response.end(JSON.stringify(value));
}

test("normalizes Crossref metadata and strips markup", () => {
	const record = normalizeCrossrefWork({
		DOI: "https://doi.org/10.1234/EXAMPLE",
		title: ["Example paper"],
		author: [{ given: "Ada", family: "Example", ORCID: "https://orcid.org/0000-0001-0000-0000" }],
		published: { "date-parts": [[2024, 2]] },
		"container-title": ["Journal of Tests"],
		abstract: "<jats:p>Useful <b>evidence</b>.</jats:p>",
	}, "2026-01-01T00:00:00.000Z");
	assert.equal(record.identifiers.doi, "10.1234/example");
	assert.equal(record.authors[0]?.name, "Ada Example");
	assert.equal(record.abstract, "Useful evidence .");
	assert.equal(record.publicationStatus, "published");
});

test("parses documented arXiv Atom fields", () => {
	const page = parseArxivFeed(arxivFeed, "2026-01-01T00:00:00.000Z");
	assert.equal(page.total, 1);
	assert.equal(page.records[0]?.identifiers.arxiv, "2501.01234");
	assert.equal(page.records[0]?.identifiers.doi, "10.1234/robust.1");
	assert.equal(page.records[0]?.title, "A & B: robust models");
	assert.equal(page.records[0]?.publicationStatus, "preprint");
	assert.equal(page.records[0]?.provenance[0]?.providerId, "http://arxiv.org/abs/2501.01234v2");
	assert.equal(page.next, undefined);
	assert.throws(() => parseArxivFeed('<feed><entry><id>http://arxiv.org/api/errors#bad_query</id><title>Error</title></entry></feed>'), /error or malformed entry/);
	assert.throws(() => parseArxivFeed('<!DOCTYPE feed><feed/>'), /document type/);
});

test("deduplicates stable identifiers but preserves conflicting DOIs", () => {
	const base: ScholarlyRecord = {
		title: "Same Title!",
		authors: [{ name: "Ada Example" }],
		identifiers: { doi: "10.1000/one" },
		publicationStatus: "published",
		statusEvidence: { status: "published", source: "crossref", reason: "fixture" },
		provenance: [{ provider: "crossref", providerId: "10.1000/one", retrievedAt: "2026-01-01T00:00:00Z" }],
	};
	const duplicate: ScholarlyRecord = {
		...base,
		identifiers: { doi: "10.1000/one", openalex: "W1" },
		provenance: [{ provider: "openalex", providerId: "W1", retrievedAt: "2026-01-01T00:00:00Z" }],
	};
	const conflict: ScholarlyRecord = { ...duplicate, identifiers: { doi: "10.1000/two", openalex: "W2" } };
	const result = deduplicateRecords([base, duplicate, conflict]);
	assert.equal(result.length, 2);
	assert.equal(result[0]?.provenance.length, 2);
});

test("clients use bounded read-only HTTP endpoints and normalize realistic responses", async () => {
	const seen: Array<{ method?: string; url?: string; apiKey?: string }> = [];
	await withServer((request, response) => {
		seen.push({ method: request.method, url: request.url, apiKey: request.headers["x-api-key"] as string | undefined });
		const url = new URL(request.url ?? "/", "http://fixture");
		if (url.pathname === "/v1/works") return json(response, { message: { "total-results": 1, items: [{ DOI: "10.1000/a", title: ["Crossref result"], author: [{ family: "Author" }], published: { "date-parts": [[2024]] } }] } });
		if (url.pathname === "/works") return json(response, { meta: { count: 1 }, results: [{ id: "https://openalex.org/W1", doi: "https://doi.org/10.1000/a", title: "OpenAlex result", publication_year: 2024, authorships: [{ author: { display_name: "A Author" } }], cited_by_count: 3 }] });
		if (url.pathname === "/graph/v1/paper/search") return json(response, { total: 1, next: 1, data: [{ paperId: "abc", externalIds: { DOI: "10.1000/a" }, title: "S2 result", authors: [{ name: "A Author" }], year: 2024 }] });
		if (url.pathname === "/notes/search" && url.searchParams.get("query") === "OpenReview result" && url.searchParams.get("source") === "forum") return json(response, { count: 1, notes: [{ id: "OR123456", cdate: 1700000000000, content: { title: { value: "OpenReview result" }, authors: { value: ["A Author"] }, venue: { value: "ICLR 2025 Conference" }, venueid: { value: "ICLR.cc/2025/Conference" } } }] });
		if (url.pathname === "/api/query") { response.setHeader("content-type", "application/atom+xml"); return response.end(arxivFeed); }
		response.statusCode = 404; response.end();
	}, async (baseUrl) => {
		const crossref = await new CrossrefClient(`${baseUrl}/v1`).search("robustness", { limit: 1 });
		const openalex = await new OpenAlexClient(baseUrl).search("robustness", { limit: 1 });
		const semantic = await new SemanticScholarClient(`${baseUrl}/graph/v1`, "fixture-key").search("robustness", { limit: 1 });
		const openreview = await new OpenReviewClient(baseUrl).search("OpenReview result", { limit: 1 });
		const arxiv = await new ArxivClient(`${baseUrl}/api/query`).search("robustness", { limit: 1 });
		assert.equal(crossref.records[0]?.identifiers.doi, "10.1000/a");
		assert.equal(openalex.records[0]?.identifiers.openalex, "W1");
		assert.equal(semantic.records[0]?.identifiers.semanticScholar, "abc");
		assert.equal(openreview.records[0]?.publicationStatus, "submitted");
		assert.equal(arxiv.records[0]?.identifiers.arxiv, "2501.01234");
	});
	assert.ok(seen.every((request) => request.method === "GET"));
	assert.ok(seen.some((request) => request.apiKey === "fixture-key"));
});

test("provider paging and arXiv query/version parameters represent the requested evidence", async () => {
	await withServer((request,response) => {
		const url = new URL(request.url ?? "/","http://fixture");
		if (url.pathname === "/works") {
			assert.equal(url.searchParams.get("page"),"2");
			assert.equal(url.searchParams.get("per_page"),"1");
			return json(response,{meta:{count:2},results:[{id:"https://openalex.org/W2",title:"Second result"}]});
		}
		if (url.searchParams.has("id_list")) assert.equal(url.searchParams.get("id_list"),"2501.01234v2");
		else assert.equal(url.searchParams.get("search_query"),'all:"distribution" AND all:"shift"');
		response.end(arxivFeed);
	}, async base => {
		const alex = new OpenAlexClient(base);
		const page = await alex.search("public question",{limit:1,offset:1});
		assert.equal(page.records[0]?.title,"Second result");
		assert.equal(page.next,undefined);
		await assert.rejects(alex.search("public question",{limit:2,offset:1}),/multiple/);
		await new ArxivClient(`${base}/api/query`).search("distribution shift",{limit:1});
		await new ArxivClient(`${base}/api/query`).lookup("2501.01234v2");
	});
});

test("synthetic literature demo refuses to overwrite existing research evidence", async () => {
	const directory = await mkdtemp(path.join(tmpdir(), "pi-research-scientist-literature-"));
	try {
	await runSyntheticLiteratureDemo(directory);
	await assert.rejects(runSyntheticLiteratureDemo(directory), { code: "EEXIST" });
	const matrix = await readFile(path.join(directory, "literature/evidence-matrix.csv"), "utf8");
	const log = await readFile(path.join(directory, "literature/search-log.md"), "utf8");
	assert.match(matrix, /evidence status/);
	assert.match(matrix, /synthetic-unverified/);
	assert.equal(log.match(/synthetic demonstration/g)?.length, 1);
	} finally { await rm(directory, { recursive: true, force: true }); }
});
