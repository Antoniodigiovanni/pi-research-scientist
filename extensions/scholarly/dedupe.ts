import { normalizeTitle } from "./text.ts";
import type { ScholarlyRecord } from "./types.ts";

function identifierKeys(record: ScholarlyRecord): string[] {
	const ids = record.identifiers;
	return [
		ids.doi && `doi:${ids.doi}`,
		ids.arxiv && `arxiv:${ids.arxiv}`,
		ids.openreview && `openreview:${ids.openreview}`,
		ids.openalex && `openalex:${ids.openalex}`,
		ids.semanticScholar && `s2:${ids.semanticScholar}`,
	].filter((value): value is string => Boolean(value));
}

function hasIdentifierConflict(left: ScholarlyRecord, right: ScholarlyRecord): boolean {
	return (["doi", "arxiv", "openreview"] as const).some((kind) => {
		const leftValue = left.identifiers[kind];
		const rightValue = right.identifiers[kind];
		return Boolean(leftValue && rightValue && leftValue !== rightValue);
	});
}

function compactIdentifiers(left: ScholarlyRecord, right: ScholarlyRecord): ScholarlyRecord["identifiers"] {
	const merged = { ...left.identifiers };
	for (const [key, value] of Object.entries(right.identifiers)) {
		if (value !== undefined && merged[key as keyof typeof merged] === undefined) merged[key as keyof typeof merged] = value;
	}
	return merged;
}

function titleAuthorKey(record: ScholarlyRecord): string | undefined {
	const title = normalizeTitle(record.title);
	if (!title) return undefined;
	const authors = record.authors.slice(0, 3).map((author) => normalizeTitle(author.name)).filter(Boolean).join("|");
	return authors ? `title:${title}|authors:${authors}` : undefined;
}

function mergeRecords(left: ScholarlyRecord, right: ScholarlyRecord): ScholarlyRecord {
	const richer = (right.abstract?.length ?? 0) > (left.abstract?.length ?? 0) ? right : left;
	const statusHistory = [...(left.statusHistory ?? [left.statusEvidence]), ...(right.statusHistory ?? [right.statusEvidence])];
	const statuses = new Set(statusHistory.map(e => e.status).filter(status => status !== "unknown"));
	const evidence = statuses.size > 1
		? { status: "unknown" as const, source: left.statusEvidence.source, reason: "Provider/version statuses differ; inspect statusHistory and verify the version being cited." }
		: statusHistory.find(e => e.status !== "unknown") ?? left.statusEvidence;
	return {
		...left,
		year: left.year ?? right.year,
		publicationDate: left.publicationDate ?? right.publicationDate,
		venue: left.venue ?? right.venue,
		type: left.type ?? right.type,
		abstract: richer.abstract,
		url: left.url ?? right.url,
		identifiers: compactIdentifiers(left, right),
		publicationStatus: evidence.status,
		statusEvidence: evidence,
		statusHistory,
		citationCount: Math.max(left.citationCount ?? 0, right.citationCount ?? 0) || undefined,
		referenceCount: Math.max(left.referenceCount ?? 0, right.referenceCount ?? 0) || undefined,
		provenance: [...left.provenance, ...right.provenance].filter(
			(entry, index, all) => all.findIndex((other) => other.provider === entry.provider && other.providerId === entry.providerId) === index,
		),
	};
}

export function deduplicateRecords(records: ScholarlyRecord[]): ScholarlyRecord[] {
	const output: ScholarlyRecord[] = [];

	for (const record of records) {
		const strongKeys = new Set(identifierKeys(record));
		const fallback = titleAuthorKey(record);
		const match = output.findIndex((candidate) => {
			if (hasIdentifierConflict(candidate, record)) return false;
			const sharesIdentifier = identifierKeys(candidate).some((key) => strongKeys.has(key));
			return sharesIdentifier || Boolean(fallback && fallback === titleAuthorKey(candidate));
		});

		if (match === -1) {
			output.push(record);
		} else {
			output[match] = mergeRecords(output[match]!, record);
		}
	}
	return output;
}
