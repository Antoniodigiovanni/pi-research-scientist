import { requestJson } from "../../src/http.ts";
import { boundedText, normalizeArxivId, normalizeDoi } from "./text.ts";
import type { PublicationStatus, ScholarlyClient, ScholarlyRecord, SearchPage } from "./types.ts";

interface OpenReviewNote {
	id?: string;
	number?: number;
	cdate?: number;
	pdate?: number;
	content?: Record<string, unknown>;
}

function contentValue<T>(content: Record<string, unknown> | undefined, key: string): T | undefined {
	const raw = content?.[key];
	if (raw && typeof raw === "object" && "value" in raw) return (raw as { value?: T }).value;
	return raw as T | undefined;
}

function inferStatus(venueId?: string, venue?: string): { status: PublicationStatus; reason: string } {
	const evidence = `${venueId ?? ""} ${venue ?? ""}`.toLowerCase();
	if (evidence.includes("withdraw")) return { status: "withdrawn", reason: "OpenReview venue metadata marks this submission withdrawn." };
	if (evidence.includes("reject") || evidence.includes("desk reject")) return { status: "rejected", reason: "OpenReview venue metadata marks this submission rejected." };
	if (/\baccepted\b|\/accepted(?:\/|$)/.test(evidence)) return { status: "accepted", reason: "OpenReview venue metadata explicitly marks acceptance; verify the decision at the venue." };
	return { status: "submitted", reason: "OpenReview exposes the work as a submission; no acceptance marker was found." };
}

export function normalizeOpenReviewNote(note: OpenReviewNote, retrievedAt = new Date().toISOString()): ScholarlyRecord {
	const content = note.content;
	const venue = contentValue<string>(content, "venue");
	const venueId = contentValue<string>(content, "venueid") ?? contentValue<string>(content, "venue_id");
	const status = inferStatus(venueId, venue);
	const publicationMs = note.pdate ?? note.cdate;
	const publicationDate = publicationMs ? new Date(publicationMs).toISOString() : undefined;
	const authorNames = contentValue<string[]>(content, "authors") ?? [];
	return {
		title: boundedText(contentValue<string>(content, "title"), 1_000) ?? "Untitled OpenReview note",
		authors: authorNames.map((name) => ({ name })),
		year: publicationDate ? Number(publicationDate.slice(0, 4)) : undefined,
		publicationDate,
		venue: boundedText(venue, 500),
		type: "OpenReview submission",
		abstract: boundedText(contentValue<string>(content, "abstract")),
		url: note.id ? `https://openreview.net/forum?id=${encodeURIComponent(note.id)}` : undefined,
		identifiers: {
			doi: normalizeDoi(contentValue<string>(content, "doi")),
			arxiv: normalizeArxivId(contentValue<string>(content, "arxiv")),
			openreview: note.id,
		},
		publicationStatus: status.status,
		statusEvidence: { status: status.status, source: "openreview", reason: status.reason },
		provenance: [{ provider: "openreview", providerId: note.id ?? String(note.number ?? "unknown"), retrievedAt }],
	};
}

export class OpenReviewClient implements ScholarlyClient {
	readonly provider = "openreview" as const;
	private readonly baseUrl: string;
	constructor(baseUrl = "https://api2.openreview.net") {
		this.baseUrl = baseUrl;
	}

	async search(query: string, options: { limit?: number; offset?: number } = {}): Promise<SearchPage> {
		const url = new URL(`${this.baseUrl}/notes/search`);
		url.searchParams.set("query", query);
		url.searchParams.set("source", "forum");
		url.searchParams.set("content", "all");
		url.searchParams.set("limit", String(Math.min(Math.max(options.limit ?? 10, 1), 50)));
		url.searchParams.set("offset", String(Math.max(options.offset ?? 0, 0)));
		const body = await requestJson<{ notes?: OpenReviewNote[]; count?: number }>(url);
		const records = (body.notes ?? []).map((note) => normalizeOpenReviewNote(note));
		const next = (options.offset ?? 0) + records.length;
		return { records, total: body.count, next: records.length && (body.count === undefined || next < body.count) ? next : undefined };
	}

	async lookup(identifier: string): Promise<ScholarlyRecord | undefined> {
		const id = identifier.trim().replace(/^https?:\/\/openreview\.net\/forum\?id=/, "");
		if (!id) throw new Error("OpenReview lookup requires a note/forum ID.");
		const url = new URL(`${this.baseUrl}/notes`);
		url.searchParams.set("id", id);
		const body = await requestJson<{ notes?: OpenReviewNote[] }>(url);
		return body.notes?.[0] ? normalizeOpenReviewNote(body.notes[0]) : undefined;
	}
}
