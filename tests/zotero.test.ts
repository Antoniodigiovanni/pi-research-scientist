import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { BetterBibtexClient, isAllowedBetterBibtexMethod } from "../extensions/zotero/better-bibtex.ts";
import { ZoteroClient } from "../extensions/zotero/client.ts";
import { writeProjectReferences } from "../extensions/zotero/index.ts";
import { extractPdfText } from "../extensions/zotero/pdf.ts";
import { chunkText } from "../src/text.ts";
import { doctor } from "../extensions/research-guardrails/doctor.ts";

function json(res: ServerResponse, body: unknown, status = 200): void {
	const source = JSON.stringify(body);
	res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(source) });
	res.end(source);
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function server(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void): Promise<{ root: URL; close: () => Promise<void> }> {
	const instance = createServer((req, res) => void Promise.resolve(handler(req, res)).catch(() => json(res, {}, 500)));
	instance.listen(0, "127.0.0.1");
	await once(instance, "listening");
	const address = instance.address();
	if (!address || typeof address === "string") throw new Error("Mock server did not bind");
	return {
		root: new URL(`http://127.0.0.1:${address.port}/`),
		close: async () => { instance.close(); await once(instance, "close"); },
	};
}

function item(key: string, itemType = "journalArticle", extra: Record<string, unknown> = {}): unknown {
	return {
		key,
		version: 3,
		data: { key, version: 3, itemType, title: "Synthetic paper", creators: [], tags: [{ tag: "fixture" }], collections: [], ...extra },
	};
}

test("Zotero local API client uses bounded GET-only v3 requests", async () => {
	const seen: string[] = [];
	const mock = await server((req, res) => {
		assert.equal(req.method, "GET");
		assert.equal(req.headers["zotero-api-version"], "3");
		seen.push(req.url ?? "");
		if (req.url?.includes("/fulltext")) return json(res, { content: "synthetic indexed text", indexedPages: 2, totalPages: 2 });
		if (req.url?.includes("/children")) return json(res, [item("CHILD001", "note", { note: "synthetic note" })]);
		if (req.url?.startsWith("/api/users/0/items?")) return json(res, [item("ITEM0001")]);
		return json(res, item("ITEM0001"));
	});
	try {
		const client = new ZoteroClient(new URL("api/", mock.root));
		const results = await client.searchItems({ query: "public topic", includeFullText: true, limit: 10 });
		assert.equal(results.items[0]?.data.title, "Synthetic paper");
		assert.match(seen[0]!, /qmode=everything/);
		assert.match(seen[0]!, /limit=10/);
		const children = await client.getChildren("ITEM0001");
		assert.equal(children.items[0]?.data.note, "synthetic note");
		assert.match(seen[1]!, /start=0&limit=25/);
		const fulltext = await client.getFullText("CHILD001");
		assert.equal(fulltext.indexedPages, 2);
	} finally { await mock.close(); }
});

test("local PDF fallback accepts only Zotero file URLs and uses execFile arguments", async () => {
	const mock = await server((req, res) => {
		if (req.url?.endsWith("/file/view/url")) {
			res.writeHead(200, { "content-type": "text/plain" });
			res.end("file:///tmp/pi-research-scientist-synthetic.pdf");
			return;
		}
		json(res, item("PDF00001", "attachment", { contentType: "application/pdf", filename: "synthetic.pdf" }));
	});
	try {
		let invocation: { file: string; args: string[] } | undefined;
		const text = await extractPdfText(new ZoteroClient(new URL("api/", mock.root)), "PDF00001", undefined, async (file, args) => {
			invocation = { file, args };
			return { stdout: "locally extracted synthetic text" };
		});
		assert.deepEqual(invocation, { file: "pdftotext", args: ["/tmp/pi-research-scientist-synthetic.pdf", "-"] });
		assert.equal(text, "locally extracted synthetic text");
	} finally { await mock.close(); }
});

test("Better BibTeX exposes only an explicit read-method allowlist", async () => {
	const calls: string[] = [];
	const mock = await server(async (req, res) => {
		assert.equal(req.method, "POST");
		const request = await body(req);
		calls.push(String(request.method));
		if (request.method === "item.bibliography") assert.deepEqual(request.params, [["synthetic2026"], { id: "apa", contentType: "text" }]);
		json(res, { jsonrpc: "2.0", id: request.id, result: request.method === "item.export" ? "@article{synthetic}" : { ITEM0001: "synthetic2026" } });
	});
	try {
		const client = new BetterBibtexClient(new URL("better-bibtex/json-rpc", mock.root));
		assert.deepEqual(await client.citationKeys(["ITEM0001"]), { ITEM0001: "synthetic2026" });
		assert.equal(await client.export(["synthetic2026"], "bibtex"), "@article{synthetic}");
		await client.bibliography(["synthetic2026"], "apa");
		assert.deepEqual(calls, ["item.citationkey", "item.export", "item.bibliography"]);
		assert.equal(isAllowedBetterBibtexMethod("item.regenerate_key"), false);
		await assert.rejects(client.call("item.regenerate_key" as never, []), /read-only allowlist/);
	} finally { await mock.close(); }
});

test("Better BibTeX errors are sanitized and project export never modifies Zotero", async () => {
	const mock = await server(async (req, res) => {
		const request = await body(req);
		json(res, { jsonrpc: "2.0", id: request.id, error: { message: "confidential remote detail" } });
	});
	try {
		await assert.rejects(new BetterBibtexClient(new URL("better-bibtex/json-rpc", mock.root)).ready(), error => {
			const message = String(error);
			return message.includes("rejected the read request") && !message.includes("confidential remote detail");
		});
	} finally { await mock.close(); }

	const root = await mkdtemp(join(tmpdir(), "pi-research-scientist-zotero-"));
	try {
		await mkdir(join(root, "paper"));
		await writeProjectReferences(root, "@article{synthetic}\n", false);
		assert.equal(await readFile(join(root, "paper", "references.bib"), "utf8"), "@article{synthetic}\n");
		await assert.rejects(writeProjectReferences(root, "replacement", false), /already exists/);
	} finally { await rm(root, { recursive: true, force: true }); }
});

test("exact citekey resolves a personal item, notes, annotations and bounded indexed text", async () => {
	const seen: string[] = [];
	const mock = await server(async (req,res) => {
		seen.push(`${req.method} ${req.url}`);
		if (req.method === "POST") {
			const request = await body(req);
			assert.equal(request.method,"item.search");
			assert.deepEqual(request.params,["example2026"]);
			return json(res,{jsonrpc:"2.0",id:request.id,result:[{id:"http://zotero.org/users/123/items/ITEM0001",citekey:"example2026",title:"Synthetic paper"}]});
		}
		assert.equal(req.method,"GET");
		if (req.url?.includes("PDF00001/fulltext")) return json(res,{content:"First page. Second page.",indexedPages:2,totalPages:2});
		if (req.url?.includes("PDF00001/children")) return json(res,[item("ANNOT001","annotation",{annotationText:"Evidence",annotationPageLabel:"2"})]);
		if (req.url?.includes("ITEM0001/children")) return json(res,[item("NOTE0001","note",{note:"Read critically"}),item("PDF00001","attachment",{contentType:"application/pdf"})]);
		return json(res,item("ITEM0001","journalArticle",{DOI:"10.1234/synthetic",publicationTitle:"Synthetic Journal"}));
	});
	try {
		const bbt = new BetterBibtexClient(new URL("better-bibtex/json-rpc",mock.root));
		const client = new ZoteroClient(new URL("api/",mock.root));
		const resolved = await bbt.lookup("example2026");
		assert.equal((await client.getItem(resolved.itemKey)).data.publicationTitle,"Synthetic Journal");
		const children = await client.getChildren(resolved.itemKey);
		assert.equal(children.items[0]?.data.note,"Read critically");
		assert.equal((await client.getChildren(children.items[1]!.key)).items[0]?.data.annotationPageLabel,"2");
		const fulltext = await client.getFullText(children.items[1]!.key);
		const first = chunkText(fulltext.content,0,12);
		assert.equal(first.nextOffset,12);
		assert.equal(first.text + chunkText(fulltext.content,first.nextOffset!,12).text,fulltext.content);
		assert.equal(seen.filter(path=>path.startsWith("POST")).length,1);
	} finally { await mock.close(); }
});

test("doctor reports local availability and remote uncertainty without exposing configured secrets", async () => {
	const mock = await server(async (req,res) => {
		if (req.method === "GET") { assert.equal(req.headers["zotero-api-version"],"3"); return json(res,[]); }
		const request = await body(req);
		assert.equal(request.method,"api.ready");
		json(res,{jsonrpc:"2.0",id:request.id,result:{betterbibtex:"test",zotero:"test"}});
	});
	const root = await mkdtemp(join(tmpdir(),"pi-research-scientist-doctor-"));
	try {
		const result = await doctor(root,[],{ZOTERO_LOCAL_API_URL:new URL("api/",mock.root).href,BETTER_BIBTEX_JSON_RPC_URL:new URL("better-bibtex/json-rpc",mock.root).href,OPENALEX_API_KEY:"credential-sentinel"});
		assert.equal(result.zotero,"reachable");
		assert.equal(result.better_bibtex,"reachable");
		assert.match(result.policy!,/invalid/);
		assert.match(result.web!,/missing/);
		assert.doesNotMatch(JSON.stringify(result),/credential-sentinel/);
	} finally { await mock.close(); await rm(root,{recursive:true,force:true}); }
});
