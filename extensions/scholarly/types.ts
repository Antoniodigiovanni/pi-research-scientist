export type ScholarlyProvider = "crossref" | "openalex" | "semantic-scholar" | "openreview" | "arxiv";

export type PublicationStatus =
	| "published"
	| "accepted"
	| "submitted"
	| "preprint"
	| "withdrawn"
	| "rejected"
	| "unknown";

export interface ScholarlyAuthor {
	name: string;
	orcid?: string;
}

export interface ScholarlyIdentifiers {
	doi?: string;
	arxiv?: string;
	openalex?: string;
	semanticScholar?: string;
	openreview?: string;
}

export interface StatusEvidence {
	status: PublicationStatus;
	source: ScholarlyProvider;
	reason: string;
}

export interface RecordProvenance {
	provider: ScholarlyProvider;
	providerId: string;
	retrievedAt: string;
}

export interface ScholarlyRecord {
	title: string;
	authors: ScholarlyAuthor[];
	year?: number;
	publicationDate?: string;
	venue?: string;
	type?: string;
	abstract?: string;
	url?: string;
	identifiers: ScholarlyIdentifiers;
	publicationStatus: PublicationStatus;
	statusEvidence: StatusEvidence;
	statusHistory?: StatusEvidence[];
	citationCount?: number;
	referenceCount?: number;
	provenance: RecordProvenance[];
}

export interface SearchPage {
	records: ScholarlyRecord[];
	next?: string | number;
	total?: number;
}

export interface ScholarlyClient {
	readonly provider: ScholarlyProvider;
	search(query: string, options?: { limit?: number; offset?: number }): Promise<SearchPage>;
	lookup(identifier: string): Promise<ScholarlyRecord | undefined>;
}
