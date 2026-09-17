export interface ZoteroCreator {
	creatorType?: string;
	firstName?: string;
	lastName?: string;
	name?: string;
}

export interface ZoteroItemData {
	key: string;
	version?: number;
	itemType: string;
	title?: string;
	creators: ZoteroCreator[];
	abstractNote?: string;
	date?: string;
	publicationTitle?: string;
	volume?: string;
	issue?: string;
	pages?: string;
	extra?: string;
	doi?: string;
	url?: string;
	parentItem?: string;
	contentType?: string;
	filename?: string;
	linkMode?: string;
	note?: string;
	annotationText?: string;
	annotationComment?: string;
	annotationPageLabel?: string;
	annotationPosition?: string;
	tags: string[];
	collections: string[];
}

export interface ZoteroItem {
	key: string;
	version?: number;
	data: ZoteroItemData;
}

export interface ZoteroCollection {
	key: string;
	version?: number;
	name: string;
	parentCollection?: string;
	numCollections?: number;
	numItems?: number;
}

export interface ZoteroFullText {
	content: string;
	indexedPages?: number;
	totalPages?: number;
	indexedCharacters?: number;
	totalCharacters?: number;
}

export interface ZoteroPage<T> {
	items: T[];
	start: number;
	limit: number;
	hasMore: boolean;
}

export type BetterBibtexMethod =
	| "api.ready"
	| "item.search"
	| "item.citationkey"
	| "item.bibliography"
	| "item.export";
