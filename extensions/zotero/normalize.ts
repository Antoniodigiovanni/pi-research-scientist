import type { ZoteroCollection, ZoteroCreator, ZoteroFullText, ZoteroItem } from "./types.ts";

function record(value: unknown, field: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Zotero returned malformed ${field}`);
	return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string, max = 100_000): string {
	if (typeof value !== "string" || !value || value.length > max) throw new Error(`Zotero returned malformed ${field}`);
	return value;
}

function optionalString(value: unknown, max = 100_000): string | undefined {
	return typeof value === "string" && value.length <= max ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function creators(value: unknown): ZoteroCreator[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > 1_000) throw new Error("Zotero returned malformed creators");
	return value.map(entry => {
		const creator = record(entry, "creator");
		return {
			creatorType: optionalString(creator.creatorType, 100),
			firstName: optionalString(creator.firstName, 10_000),
			lastName: optionalString(creator.lastName, 10_000),
			name: optionalString(creator.name, 10_000),
		};
	});
}

function tags(value: unknown): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > 5_000) throw new Error("Zotero returned malformed tags");
	return value.map(entry => requiredString(record(entry, "tag").tag, "tag", 1_000));
}

function collections(value: unknown): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > 5_000) throw new Error("Zotero returned malformed collections");
	return value.map(entry => requiredString(entry, "collection key", 100));
}

export function normalizeItem(value: unknown): ZoteroItem {
	const envelope = record(value, "item");
	const data = record(envelope.data, "item data");
	const key = requiredString(data.key ?? envelope.key, "item key", 100);
	return {
		key,
		version: optionalInteger(data.version ?? envelope.version),
		data: {
			key,
			version: optionalInteger(data.version ?? envelope.version),
			itemType: requiredString(data.itemType, "item type", 100),
			title: optionalString(data.title),
			creators: creators(data.creators),
			abstractNote: optionalString(data.abstractNote),
			date: optionalString(data.date, 1_000),
			publicationTitle: optionalString(data.publicationTitle),
			volume: optionalString(data.volume, 1_000),
			issue: optionalString(data.issue, 1_000),
			pages: optionalString(data.pages, 1_000),
			extra: optionalString(data.extra),
			doi: optionalString(data.DOI, 1_000),
			url: optionalString(data.url),
			parentItem: optionalString(data.parentItem, 100),
			contentType: optionalString(data.contentType, 1_000),
			filename: optionalString(data.filename, 10_000),
			linkMode: optionalString(data.linkMode, 100),
			note: optionalString(data.note),
			annotationText: optionalString(data.annotationText),
			annotationComment: optionalString(data.annotationComment),
			annotationPageLabel: optionalString(data.annotationPageLabel, 1_000),
			annotationPosition: optionalString(data.annotationPosition),
			tags: tags(data.tags),
			collections: collections(data.collections),
		},
	};
}

export function normalizeItems(value: unknown): ZoteroItem[] {
	if (!Array.isArray(value) || value.length > 1_000) throw new Error("Zotero returned malformed or oversized item list");
	return value.map(normalizeItem);
}

export function normalizeCollection(value: unknown): ZoteroCollection {
	const envelope = record(value, "collection");
	const data = record(envelope.data, "collection data");
	return {
		key: requiredString(data.key ?? envelope.key, "collection key", 100),
		version: optionalInteger(data.version ?? envelope.version),
		name: requiredString(data.name, "collection name"),
		parentCollection: optionalString(data.parentCollection, 100),
		numCollections: optionalInteger(envelope.meta && record(envelope.meta, "collection metadata").numCollections),
		numItems: optionalInteger(envelope.meta && record(envelope.meta, "collection metadata").numItems),
	};
}

export function normalizeCollections(value: unknown): ZoteroCollection[] {
	if (!Array.isArray(value) || value.length > 1_000) throw new Error("Zotero returned malformed or oversized collection list");
	return value.map(normalizeCollection);
}

export function normalizeFullText(value: unknown): ZoteroFullText {
	const fulltext = record(value, "full-text response");
	return {
		content: typeof fulltext.content === "string" && fulltext.content.length <= 10_000_000 ? fulltext.content : requiredString(fulltext.content, "full-text content", 10_000_000),
		indexedPages: optionalInteger(fulltext.indexedPages),
		totalPages: optionalInteger(fulltext.totalPages),
		indexedCharacters: optionalInteger(fulltext.indexedChars),
		totalCharacters: optionalInteger(fulltext.totalChars),
	};
}
