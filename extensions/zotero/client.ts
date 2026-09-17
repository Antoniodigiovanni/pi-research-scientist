import { loopbackUrl, requestJson, requestText } from "../../src/http.ts";
import { normalizeCollection, normalizeCollections, normalizeFullText, normalizeItem, normalizeItems } from "./normalize.ts";
import type { ZoteroCollection, ZoteroFullText, ZoteroItem, ZoteroPage } from "./types.ts";

const KEY = /^[A-Z0-9]{8}$/;

export function zoteroKey(value: string, label = "Zotero key"): string {
	if (!KEY.test(value)) throw new Error(`${label} must be an eight-character Zotero key`);
	return value;
}

function localApiBase(value: string | URL): URL {
	const url = loopbackUrl(String(value));
	if (!/^\/api\/?$/.test(url.pathname)) throw new Error("Zotero local API URL must end in /api/");
	url.pathname = "/api/";
	return url;
}

function boundedPage(start: number, limit: number): void {
	if (!Number.isInteger(start) || start < 0 || start > 1_000_000) throw new Error("Zotero start must be between 0 and 1000000");
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Zotero limit must be between 1 and 100");
}

export class ZoteroClient {
	readonly base: URL;

	constructor(base: string | URL = "http://127.0.0.1:23119/api/") {
		this.base = localApiBase(base);
	}

	#url(path: string, query?: URLSearchParams): URL {
		if (!path.startsWith("users/0/") || path.includes("..")) throw new Error("Unsupported Zotero local API path");
		const url = new URL(path, this.base);
		if (query) url.search = query.toString();
		return url;
	}

	async #json(path: string, query?: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
		return requestJson(this.#url(path, query), {
			method: "GET",
			headers: { "Zotero-API-Version": "3" },
			signal,
			maxBytes: 4_000_000,
			timeoutMs: 10_000,
		});
	}

	async listCollections(start = 0, limit = 50, signal?: AbortSignal): Promise<ZoteroPage<ZoteroCollection>> {
		boundedPage(start, limit);
		const query = new URLSearchParams({ start: String(start), limit: String(limit) });
		const items = normalizeCollections(await this.#json("users/0/collections", query, signal));
		return { items, start, limit, hasMore: items.length === limit };
	}

	async getCollection(key: string, signal?: AbortSignal): Promise<ZoteroCollection> {
		return normalizeCollection(await this.#json(`users/0/collections/${zoteroKey(key, "Collection key")}`, undefined, signal));
	}

	async searchItems(input: {
		query: string;
		includeFullText?: boolean;
		itemType?: string;
		tag?: string;
		collectionKey?: string;
		start?: number;
		limit?: number;
	}, signal?: AbortSignal): Promise<ZoteroPage<ZoteroItem>> {
		const start = input.start ?? 0;
		const limit = input.limit ?? 25;
		boundedPage(start, limit);
		if (!input.query || input.query.length > 500) throw new Error("Zotero query must contain 1 to 500 characters");
		const query = new URLSearchParams({ q: input.query, qmode: input.includeFullText ? "everything" : "titleCreatorYear", start: String(start), limit: String(limit) });
		if (input.itemType) query.set("itemType", input.itemType.slice(0, 100));
		if (input.tag) query.set("tag", input.tag.slice(0, 1_000));
		const path = input.collectionKey
			? `users/0/collections/${zoteroKey(input.collectionKey, "Collection key")}/items`
			: "users/0/items";
		const items = normalizeItems(await this.#json(path, query, signal));
		return { items, start, limit, hasMore: items.length === limit };
	}

	async getItem(key: string, signal?: AbortSignal): Promise<ZoteroItem> {
		return normalizeItem(await this.#json(`users/0/items/${zoteroKey(key, "Item key")}`, undefined, signal));
	}

	async getChildren(key: string, signal?: AbortSignal, start = 0, limit = 25): Promise<ZoteroPage<ZoteroItem>> {
		boundedPage(start, limit);
		const query = new URLSearchParams({ start: String(start), limit: String(limit) });
		const items = normalizeItems(await this.#json(`users/0/items/${zoteroKey(key, "Item key")}/children`, query, signal));
		return { items, start, limit, hasMore: items.length === limit };
	}

	async getFullText(key: string, signal?: AbortSignal): Promise<ZoteroFullText> {
		return normalizeFullText(await this.#json(`users/0/items/${zoteroKey(key, "Attachment key")}/fulltext`, undefined, signal));
	}

	async getAttachmentFileUrl(key: string, signal?: AbortSignal): Promise<string> {
		const path = `users/0/items/${zoteroKey(key, "Attachment key")}/file/view/url`;
		return (await requestText(this.#url(path), {
			method: "GET",
			headers: { "Zotero-API-Version": "3" },
			signal,
			maxBytes: 20_000,
			timeoutMs: 10_000,
		})).trim();
	}
}

export function createZoteroClient(environment: NodeJS.ProcessEnv = process.env): ZoteroClient {
	return new ZoteroClient(environment.ZOTERO_LOCAL_API_URL ?? "http://127.0.0.1:23119/api/");
}
