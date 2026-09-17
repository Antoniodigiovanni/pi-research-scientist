import { XMLParser } from "fast-xml-parser";
import { requestText } from "../../src/http.ts";
import { boundedText, normalizeArxivId, normalizeDoi } from "./text.ts";
import type { ScholarlyClient, ScholarlyRecord, SearchPage } from "./types.ts";

interface ArxivAuthor { name?: unknown }
interface ArxivLink { "@_href"?: string; "@_rel"?: string }
interface ArxivEntry {
	id?: unknown;
	title?: unknown;
	summary?: unknown;
	published?: unknown;
	author?: ArxivAuthor[];
	link?: ArxivLink[];
	"arxiv:doi"?: unknown;
	"arxiv:journal_ref"?: unknown;
}
interface ArxivFeed {
	feed?: {
		entry?: ArxivEntry[];
		"opensearch:totalResults"?: unknown;
		"opensearch:startIndex"?: unknown;
	};
}

const parser = new XMLParser({
	ignoreAttributes: false,
	processEntities: true,
	trimValues: true,
	isArray: (_name, path) => typeof path === "string" && (path === "feed.entry" || path.endsWith(".author") || path.endsWith(".link")),
});

function scalar(value: unknown): string | undefined {
	if (typeof value === "string" || typeof value === "number") return String(value).trim() || undefined;
	return undefined;
}

export function parseArxivFeed(xml: string, retrievedAt = new Date().toISOString()): SearchPage {
	if (/<!DOCTYPE/i.test(xml)) throw new Error("arXiv Atom must not contain a document type declaration");
	let parsed: ArxivFeed;
	try {
		parsed = parser.parse(xml) as ArxivFeed;
	} catch {
		throw new Error("arXiv returned malformed Atom XML.");
	}
	const feed = parsed.feed;
	if (!feed) throw new Error("arXiv response does not contain an Atom feed.");
	const records = (feed.entry ?? []).map((entry): ScholarlyRecord => {
		const idUrl = scalar(entry.id);
		const arxiv = normalizeArxivId(idUrl);
		if (!arxiv) throw new Error("arXiv returned an error or malformed entry instead of a paper");
		const published = scalar(entry.published);
		const journalReference = scalar(entry["arxiv:journal_ref"]);
		const doi = normalizeDoi(scalar(entry["arxiv:doi"]));
		const alternate = (entry.link ?? []).find((link) => link["@_rel"] === "alternate")?.["@_href"];
		return {
			title: boundedText(scalar(entry.title), 1_000) ?? "Untitled preprint",
			authors: (entry.author ?? []).flatMap((author) => {
				const name = scalar(author.name);
				return name ? [{ name }] : [];
			}),
			year: published ? Number(published.slice(0, 4)) : undefined,
			publicationDate: published,
			venue: boundedText(journalReference, 500),
			type: "preprint",
			abstract: boundedText(scalar(entry.summary)),
			url: alternate ?? idUrl,
			identifiers: { doi, arxiv },
			publicationStatus: "preprint",
			statusEvidence: {
				status: "preprint",
				source: "arxiv",
				reason: journalReference || doi
					? "arXiv reports a DOI or journal reference, but publisher metadata must verify formal publication."
					: "arXiv records the work as an e-print without publication metadata.",
			},
			provenance: [{ provider: "arxiv", providerId: idUrl ?? arxiv ?? "unknown", retrievedAt }],
		};
	});
	const total = Number(scalar(feed["opensearch:totalResults"]));
	const start = Number(scalar(feed["opensearch:startIndex"]));
	return { records, total: Number.isFinite(total) ? total : undefined, next: records.length && Number.isFinite(start) && start + records.length < (Number.isFinite(total) ? total : Infinity) ? start + records.length : undefined };
}

export class ArxivClient implements ScholarlyClient {
	readonly provider = "arxiv" as const;
	private readonly baseUrl: string;
	private lastRequestAt = 0;
	constructor(baseUrl = "https://export.arxiv.org/api/query") {
		this.baseUrl = baseUrl;
	}

	private async request(url: URL): Promise<string> {
		const scheduledAt = Math.max(Date.now(), this.lastRequestAt + 3_000);
		this.lastRequestAt = scheduledAt;
		const waitMs = scheduledAt - Date.now();
		if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
		return requestText(url);
	}

	async search(query: string, options: { limit?: number; offset?: number } = {}): Promise<SearchPage> {
		const url = new URL(this.baseUrl);
		// arXiv requires an explicit operator between terms; an ungrouped phrase
		// after all: produces a much broader query than the caller intended.
		const terms = query.replace(/"/g, "").trim().split(/\s+/).filter(Boolean);
		url.searchParams.set("search_query", terms.map(term => `all:"${term}"`).join(" AND "));
		url.searchParams.set("start", String(Math.max(options.offset ?? 0, 0)));
		url.searchParams.set("max_results", String(Math.min(Math.max(options.limit ?? 10, 1), 30)));
		url.searchParams.set("sortBy", "relevance");
		return parseArxivFeed(await this.request(url));
	}

	async lookup(identifier: string): Promise<ScholarlyRecord | undefined> {
		const arxiv = normalizeArxivId(identifier);
		if (!arxiv) throw new Error("arXiv lookup requires an arXiv identifier.");
		const url = new URL(this.baseUrl);
		const version = identifier.replace(/\.pdf$/i, "").match(/v\d+$/i)?.[0] ?? "";
		url.searchParams.set("id_list", `${arxiv}${version}`);
		url.searchParams.set("max_results", "1");
		return parseArxivFeed(await this.request(url)).records[0];
	}
}
