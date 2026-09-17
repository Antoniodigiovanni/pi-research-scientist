import { requestJson } from "../../src/http.ts";
import { boundedText, normalizeDoi, stripMarkup } from "./text.ts";
import type { ScholarlyAuthor, ScholarlyClient, ScholarlyRecord, SearchPage } from "./types.ts";

interface CrossrefEnvelope<T> { message: T }
interface CrossrefWork {
	DOI?: string;
	title?: string[];
	author?: Array<{ given?: string; family?: string; ORCID?: string }>;
	published?: { "date-parts"?: number[][] };
	created?: { "date-time"?: string };
	"container-title"?: string[];
	type?: string;
	abstract?: string;
	URL?: string;
	"is-referenced-by-count"?: number;
	"references-count"?: number;
}

function dateParts(work: CrossrefWork): { year?: number; date?: string } {
	const parts = work.published?.["date-parts"]?.[0];
	if (!parts?.[0]) return {};
	return { year: parts[0], date: parts.map((part, index) => index ? String(part).padStart(2, "0") : String(part)).join("-") };
}

export function normalizeCrossrefWork(work: CrossrefWork, retrievedAt = new Date().toISOString()): ScholarlyRecord {
	const doi = normalizeDoi(work.DOI);
	const dates = dateParts(work);
	const authors: ScholarlyAuthor[] = (work.author ?? []).map((author) => ({
		name: [author.given, author.family].filter(Boolean).join(" ") || "Unknown author",
		orcid: author.ORCID?.replace(/^https?:\/\/orcid\.org\//, ""),
	}));
	const published = Boolean(dates.year || work["container-title"]?.[0]);
	const status = work.type === "posted-content" ? "preprint" : published ? "published" : "unknown";
	return {
		title: boundedText(work.title?.[0], 1_000) ?? "Untitled work",
		authors,
		year: dates.year,
		publicationDate: dates.date,
		venue: boundedText(work["container-title"]?.[0], 500),
		type: work.type,
		abstract: stripMarkup(work.abstract),
		url: work.URL,
		identifiers: { doi },
		publicationStatus: status,
		statusEvidence: {
			status,
			source: "crossref",
			reason: status === "preprint" ? "Crossref identifies posted content; this does not establish peer review." : published ? "Crossref deposited publication metadata; peer review is not verified." : "Crossref metadata has no publication date or venue.",
		},
		citationCount: work["is-referenced-by-count"],
		referenceCount: work["references-count"],
		provenance: [{ provider: "crossref", providerId: doi ?? work.URL ?? "unknown", retrievedAt }],
	};
}

export class CrossrefClient implements ScholarlyClient {
	readonly provider = "crossref" as const;
	private readonly baseUrl: string;
	private readonly mailto?: string;
	constructor(
		baseUrl = "https://api.crossref.org/v1",
		mailto?: string,
	) {
		this.baseUrl = baseUrl;
		this.mailto = mailto;
	}

	async search(query: string, options: { limit?: number; offset?: number } = {}): Promise<SearchPage> {
		const url = new URL(`${this.baseUrl}/works`);
		url.searchParams.set("query.bibliographic", query);
		url.searchParams.set("rows", String(Math.min(Math.max(options.limit ?? 10, 1), 50)));
		url.searchParams.set("offset", String(Math.max(options.offset ?? 0, 0)));
		if (this.mailto) url.searchParams.set("mailto", this.mailto);
		const body = await requestJson<CrossrefEnvelope<{ items?: CrossrefWork[]; "total-results"?: number }>>(url, {
			headers: { "User-Agent": `pi-research-scientist/0.1 (${this.mailto ? `mailto:${this.mailto}` : "no contact configured"})` },
		});
		const records = (body.message.items ?? []).map((work) => normalizeCrossrefWork(work));
		const next = (options.offset ?? 0) + records.length;
		return { records, total: body.message["total-results"], next: records.length && next < (body.message["total-results"] ?? Infinity) ? next : undefined };
	}

	async lookup(identifier: string): Promise<ScholarlyRecord | undefined> {
		const doi = normalizeDoi(identifier);
		if (!doi) throw new Error("Crossref lookup requires a DOI.");
		const url = new URL(`${this.baseUrl}/works/${encodeURIComponent(doi)}`);
		if (this.mailto) url.searchParams.set("mailto", this.mailto);
		const body = await requestJson<CrossrefEnvelope<CrossrefWork>>(url);
		return normalizeCrossrefWork(body.message);
	}
}
