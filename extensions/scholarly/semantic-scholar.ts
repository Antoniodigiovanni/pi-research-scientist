import { requestJson } from "../../src/http.ts";
import { boundedText, normalizeArxivId, normalizeDoi } from "./text.ts";
import type { ScholarlyClient, ScholarlyRecord, SearchPage } from "./types.ts";

interface S2Paper {
	paperId?: string;
	externalIds?: { DOI?: string; ArXiv?: string };
	title?: string;
	authors?: Array<{ name?: string }>;
	year?: number;
	publicationDate?: string;
	venue?: string;
	publicationTypes?: string[];
	abstract?: string;
	url?: string;
	citationCount?: number;
	referenceCount?: number;
}

const FIELDS = "paperId,externalIds,title,authors,year,publicationDate,venue,publicationTypes,abstract,url,citationCount,referenceCount";

export function normalizeSemanticScholarPaper(paper: S2Paper, retrievedAt = new Date().toISOString()): ScholarlyRecord {
	const published = Boolean(paper.venue && paper.publicationDate);
	const status = /arxiv|biorxiv|medrxiv/i.test(paper.venue ?? "") || paper.publicationTypes?.includes("Preprint") ? "preprint" : published ? "published" : "unknown";
	return {
		title: boundedText(paper.title, 1_000) ?? "Untitled work",
		authors: (paper.authors ?? []).flatMap((author) => author.name ? [{ name: author.name }] : []),
		year: paper.year,
		publicationDate: paper.publicationDate,
		venue: boundedText(paper.venue, 500),
		type: paper.publicationTypes?.join(", "),
		abstract: boundedText(paper.abstract),
		url: paper.url,
		identifiers: {
			doi: normalizeDoi(paper.externalIds?.DOI),
			arxiv: normalizeArxivId(paper.externalIds?.ArXiv),
			semanticScholar: paper.paperId,
		},
		publicationStatus: status,
		statusEvidence: {
			status,
			source: "semantic-scholar",
			reason: status === "preprint" ? "Semantic Scholar reports a preprint repository or type." : published ? "Semantic Scholar reports a venue and publication date; peer review is not verified." : "Semantic Scholar metadata does not establish formal publication.",
		},
		citationCount: paper.citationCount,
		referenceCount: paper.referenceCount,
		provenance: [{ provider: "semantic-scholar", providerId: paper.paperId ?? "unknown", retrievedAt }],
	};
}

export class SemanticScholarClient implements ScholarlyClient {
	readonly provider = "semantic-scholar" as const;
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	constructor(
		baseUrl = "https://api.semanticscholar.org/graph/v1",
		apiKey?: string,
	) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
	}

	private headers(): Record<string, string> {
		return this.apiKey ? { "x-api-key": this.apiKey } : {};
	}

	async search(query: string, options: { limit?: number; offset?: number } = {}): Promise<SearchPage> {
		const url = new URL(`${this.baseUrl}/paper/search`);
		url.searchParams.set("query", query);
		url.searchParams.set("limit", String(Math.min(Math.max(options.limit ?? 10, 1), 50)));
		url.searchParams.set("offset", String(Math.max(options.offset ?? 0, 0)));
		url.searchParams.set("fields", FIELDS);
		const body = await requestJson<{ total?: number; next?: number; data?: S2Paper[] }>(url, { headers: this.headers() });
		return { records: (body.data ?? []).map((paper) => normalizeSemanticScholarPaper(paper)), total: body.total, next: body.next };
	}

	async lookup(identifier: string): Promise<ScholarlyRecord | undefined> {
		const doi = normalizeDoi(identifier);
		const arxiv = normalizeArxivId(identifier);
		const id = doi ? `DOI:${doi}` : arxiv ? `ARXIV:${arxiv}` : identifier.trim();
		if (!id) throw new Error("Semantic Scholar lookup requires a paper identifier.");
		const url = new URL(`${this.baseUrl}/paper/${encodeURIComponent(id)}`);
		url.searchParams.set("fields", FIELDS);
		return normalizeSemanticScholarPaper(await requestJson<S2Paper>(url, { headers: this.headers() }));
	}

	async neighbors(identifier: string, relation: "citations" | "references", limit = 10, offset = 0): Promise<SearchPage> {
		const doi = normalizeDoi(identifier);
		const arxiv = normalizeArxivId(identifier);
		const id = doi ? `DOI:${doi}` : arxiv ? `ARXIV:${arxiv}` : identifier.trim();
		const url = new URL(`${this.baseUrl}/paper/${encodeURIComponent(id)}/${relation}`);
		url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));
		url.searchParams.set("offset", String(Math.max(offset, 0)));
		url.searchParams.set("fields", FIELDS);
		const body = await requestJson<{ next?: number; data?: Array<{ citingPaper?: S2Paper; citedPaper?: S2Paper }> }>(url, { headers: this.headers() });
		const records = (body.data ?? []).flatMap((edge) => {
			const paper = relation === "citations" ? edge.citingPaper : edge.citedPaper;
			return paper ? [normalizeSemanticScholarPaper(paper)] : [];
		});
		return { records, next: body.next };
	}
}
