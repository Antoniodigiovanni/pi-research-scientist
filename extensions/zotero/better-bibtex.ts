import { loopbackUrl, requestJson } from "../../src/http.ts";
import type { BetterBibtexMethod } from "./types.ts";

const ALLOWED_METHODS = new Set<BetterBibtexMethod>([
	"api.ready",
	"item.search",
	"item.citationkey",
	"item.bibliography",
	"item.export",
]);

function endpoint(value: string | URL): URL {
	const url = loopbackUrl(String(value));
	if (url.pathname !== "/better-bibtex/json-rpc") throw new Error("Better BibTeX URL must be its loopback JSON-RPC endpoint");
	return url;
}

function record(value: unknown, field: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Better BibTeX returned malformed ${field}`);
	return value as Record<string, unknown>;
}

export class BetterBibtexClient {
	readonly url: URL;
	#nextId = 1;

	constructor(url: string | URL = "http://127.0.0.1:23119/better-bibtex/json-rpc") {
		this.url = endpoint(url);
	}

	async call(method: BetterBibtexMethod, params: unknown[], signal?: AbortSignal): Promise<unknown> {
		if (!ALLOWED_METHODS.has(method)) throw new Error("Better BibTeX method is not in the read-only allowlist");
		if (!Array.isArray(params) || params.length > 1_000) throw new Error("Better BibTeX parameters are malformed");
		const id = this.#nextId++;
		const response = record(await requestJson(this.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
			signal,
			maxBytes: 4_000_000,
			timeoutMs: 15_000,
		}), "JSON-RPC response");
		if (response.id !== id || response.jsonrpc !== "2.0") throw new Error("Better BibTeX returned a mismatched JSON-RPC response");
		if (response.error !== undefined) throw new Error("Better BibTeX rejected the read request; check plugin availability and parameters");
		if (!("result" in response)) throw new Error("Better BibTeX returned no result");
		return response.result;
	}

	ready(signal?: AbortSignal): Promise<unknown> { return this.call("api.ready", [], signal); }
	search(terms: string, signal?: AbortSignal): Promise<unknown> {
		if (!terms || terms.length > 500) throw new Error("Better BibTeX search must contain 1 to 500 characters");
		return this.call("item.search", [terms], signal);
	}
	async lookup(citationKey: string, signal?: AbortSignal): Promise<{ citationKey: string; itemKey: string }> {
		const result = await this.search(citationKey, signal);
		if (!Array.isArray(result)) throw new Error("Better BibTeX returned malformed search results");
		const matches = result.map(value => record(value, "search item")).filter(item => item.citekey === citationKey);
		if (matches.length !== 1) throw new Error("Citation key is missing or ambiguous; inspect Better BibTeX search results and select the intended item");
		const uri = matches[0]!.id;
		// CSL IDs are Zotero item URIs. Never silently map a group item into users/0.
		const key = typeof uri === "string" ? uri.match(/^https?:\/\/(?:www\.)?zotero\.org\/users\/(?:\d+|local\/[A-Za-z0-9]+)\/items\/([A-Z0-9]{8})$/)?.[1] : undefined;
		if (!key) throw new Error("Better BibTeX did not return a personal-library item URI; group libraries are not supported by the local item tools");
		return { citationKey, itemKey: key };
	}
	citationKeys(itemKeys: string[], signal?: AbortSignal): Promise<unknown> {
		if (!itemKeys.length || itemKeys.length > 200) throw new Error("Choose between 1 and 200 Zotero item keys");
		return this.call("item.citationkey", [itemKeys], signal);
	}
	bibliography(citationKeys: string[], format?: string, signal?: AbortSignal): Promise<unknown> {
		if (!citationKeys.length || citationKeys.length > 500) throw new Error("Choose between 1 and 500 citation keys");
		return this.call("item.bibliography", [citationKeys, format ? { id: format, contentType: "text" } : { quickCopy: true, contentType: "text" }], signal);
	}
	export(citationKeys: string[], format: "bibtex" | "biblatex", signal?: AbortSignal): Promise<string> {
		if (!citationKeys.length || citationKeys.length > 500) throw new Error("Choose between 1 and 500 citation keys");
		const translator = format === "biblatex" ? "Better BibLaTeX" : "Better BibTeX";
		return this.call("item.export", [citationKeys, translator], signal).then(result => {
			if (typeof result !== "string" || result.length > 4_000_000) throw new Error("Better BibTeX returned malformed or oversized export text");
			return result;
		});
	}
}

export function createBetterBibtexClient(environment: NodeJS.ProcessEnv = process.env): BetterBibtexClient {
	return new BetterBibtexClient(environment.BETTER_BIBTEX_JSON_RPC_URL ?? "http://127.0.0.1:23119/better-bibtex/json-rpc");
}

export function isAllowedBetterBibtexMethod(method: string): method is BetterBibtexMethod {
	return ALLOWED_METHODS.has(method as BetterBibtexMethod);
}
