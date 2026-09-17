import { requestJson } from "../../src/http.ts";
import { boundedText, normalizeArxivId, normalizeDoi } from "./text.ts";
import type { ScholarlyClient, ScholarlyRecord, SearchPage } from "./types.ts";

interface OpenAlexWork {
	id?: string;
	doi?: string;
	title?: string;
	display_name?: string;
	publication_year?: number;
	publication_date?: string;
	type?: string;
	authorships?: Array<{ author?: { display_name?: string; orcid?: string } }>;
	primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
	ids?: { doi?: string; openalex?: string; pmid?: string };
	abstract_inverted_index?: Record<string, number[]>;
	cited_by_count?: number;
	referenced_works_count?: number;
	referenced_works?: string[];
	related_works?: string[];
	best_oa_location?: { landing_page_url?: string };
}

function abstractFromIndex(index?: Record<string, number[]>): string | undefined {
	if (!index) return undefined;
	const words: Array<[number, string]> = [];
	for (const [word, positions] of Object.entries(index)) {
		for (const position of positions) words.push([position, word]);
	}
	return boundedText(words.sort((a, b) => a[0] - b[0]).map((entry) => entry[1]).join(" "));
}

function shortOpenAlexId(value?: string): string | undefined {
	return value?.match(/W\d+$/)?.[0];
}

export function normalizeOpenAlexWork(work: OpenAlexWork, retrievedAt = new Date().toISOString()): ScholarlyRecord {
	const id = shortOpenAlexId(work.id ?? work.ids?.openalex);
	const venue = work.primary_location?.source?.display_name;
	const published = Boolean(venue && work.publication_year);
	const status = work.type === "preprint" || /arxiv|biorxiv|medrxiv/i.test(venue ?? "") ? "preprint" : published ? "published" : "unknown";
	return {
		title: boundedText(work.title ?? work.display_name, 1_000) ?? "Untitled work",
		authors: (work.authorships ?? []).flatMap(({ author }) => author?.display_name ? [{ name: author.display_name, orcid: author.orcid?.replace(/^https?:\/\/orcid\.org\//, "") }] : []),
		year: work.publication_year,
		publicationDate: work.publication_date,
		venue: boundedText(venue, 500),
		type: work.type,
		abstract: abstractFromIndex(work.abstract_inverted_index),
		url: work.primary_location?.landing_page_url ?? work.best_oa_location?.landing_page_url ?? work.id,
		identifiers: {
			doi: normalizeDoi(work.doi ?? work.ids?.doi),
			arxiv: normalizeArxivId(work.primary_location?.landing_page_url),
			openalex: id,
		},
		publicationStatus: status,
		statusEvidence: {
			status,
			source: "openalex",
			reason: status === "preprint" ? "OpenAlex reports a preprint type or repository source." : published ? "OpenAlex reports a source and publication year; peer review is not verified." : "OpenAlex metadata does not establish formal publication.",
		},
		citationCount: work.cited_by_count,
		referenceCount: work.referenced_works_count,
		provenance: [{ provider: "openalex", providerId: id ?? work.id ?? "unknown", retrievedAt }],
	};
}

export class OpenAlexClient implements ScholarlyClient {
	readonly provider = "openalex" as const;
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	constructor(
		baseUrl = "https://api.openalex.org",
		apiKey?: string,
	) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
	}

	private headers(): Record<string, string> {
		return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
	}

	async search(query: string, options: { limit?: number; offset?: number } = {}): Promise<SearchPage> {
		const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
		const offset = Math.max(options.offset ?? 0, 0);
		if (offset % limit !== 0) throw new Error("OpenAlex offset must be a multiple of the page limit");
		const page = Math.floor(offset / limit) + 1;
		const url = new URL(`${this.baseUrl}/works`);
		url.searchParams.set("search", query);
		url.searchParams.set("per_page", String(limit));
		url.searchParams.set("page", String(page));
		const body = await requestJson<{ meta?: { count?: number }; results?: OpenAlexWork[] }>(url, { headers: this.headers() });
		const records = (body.results ?? []).map((work) => normalizeOpenAlexWork(work));
		return { records, total: body.meta?.count, next: records.length && offset + records.length < (body.meta?.count ?? Infinity) ? offset + records.length : undefined };
	}

	async lookup(identifier: string): Promise<ScholarlyRecord | undefined> {
		const doi = normalizeDoi(identifier);
		const id = doi ? `https://doi.org/${doi}` : shortOpenAlexId(identifier);
		if (!id) throw new Error("OpenAlex lookup requires a DOI or OpenAlex work ID.");
		const body = await requestJson<OpenAlexWork>(new URL(`${this.baseUrl}/works/${encodeURIComponent(id)}`), { headers: this.headers() });
		return normalizeOpenAlexWork(body);
	}

	async neighbors(identifier: string, relation: "citations" | "references" | "related", limit = 10, offset = 0): Promise<SearchPage> {
		const work = await this.getRaw(identifier);
		const id = shortOpenAlexId(work.id);
		if (!id) return { records: [] };
		if (relation === "citations") {
			const url = new URL(`${this.baseUrl}/works`);
			url.searchParams.set("filter", `cites:${id}`);
			url.searchParams.set("per_page", String(Math.min(Math.max(limit, 1), 50)));
			if (offset % limit !== 0) throw new Error("OpenAlex citation offset must be a multiple of the page limit");
			url.searchParams.set("page", String(offset / limit + 1));
			const body = await requestJson<{ results?: OpenAlexWork[]; meta?: { count?: number } }>(url, { headers: this.headers() });
			const records = (body.results ?? []).map((item) => normalizeOpenAlexWork(item));
			return { records, total: body.meta?.count, next: records.length && offset + records.length < (body.meta?.count ?? Infinity) ? offset + records.length : undefined };
		}
		const ids = relation === "references" ? work.referenced_works : work.related_works;
		if (!ids?.length || offset >= ids.length) return { records: [], total: ids?.length ?? 0 };
		const values = ids.slice(offset, offset + Math.min(Math.max(limit, 1), 50)).map(shortOpenAlexId).filter(Boolean).join("|");
		const url = new URL(`${this.baseUrl}/works`);
		url.searchParams.set("filter", `openalex:${values}`);
		url.searchParams.set("per_page", String(Math.min(limit, 50)));
		const body = await requestJson<{ results?: OpenAlexWork[] }>(url, { headers: this.headers() });
		return { records: (body.results ?? []).map((item) => normalizeOpenAlexWork(item)), total: ids.length, next: offset + limit < ids.length ? offset + limit : undefined };
	}

	private async getRaw(identifier: string): Promise<OpenAlexWork> {
		const doi = normalizeDoi(identifier);
		const id = doi ? `https://doi.org/${doi}` : shortOpenAlexId(identifier);
		if (!id) throw new Error("OpenAlex neighbor lookup requires a DOI or OpenAlex work ID.");
		return requestJson<OpenAlexWork>(new URL(`${this.baseUrl}/works/${encodeURIComponent(id)}`), { headers: this.headers() });
	}
}
