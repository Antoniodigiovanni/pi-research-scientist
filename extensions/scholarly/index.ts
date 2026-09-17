import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { toolResult } from "../../src/text.ts";
import { ArxivClient } from "./arxiv.ts";
import { CrossrefClient } from "./crossref.ts";
import { deduplicateRecords } from "./dedupe.ts";
import { OpenAlexClient } from "./openalex.ts";
import { OpenReviewClient } from "./openreview.ts";
import { SemanticScholarClient } from "./semantic-scholar.ts";
import type { ScholarlyClient, ScholarlyProvider, ScholarlyRecord } from "./types.ts";

const providerSchema = Type.Union([
	Type.Literal("crossref"),
	Type.Literal("openalex"),
	Type.Literal("semantic-scholar"),
	Type.Literal("openreview"),
	Type.Literal("arxiv"),
]);

export interface ScholarlyClients {
	crossref: CrossrefClient;
	openalex: OpenAlexClient;
	"semantic-scholar": SemanticScholarClient;
	openreview: OpenReviewClient;
	arxiv: ArxivClient;
}

export function createScholarlyClients(environment: NodeJS.ProcessEnv = process.env): ScholarlyClients {
	return {
		crossref: new CrossrefClient("https://api.crossref.org/v1", environment.CROSSREF_MAILTO),
		openalex: new OpenAlexClient("https://api.openalex.org", environment.OPENALEX_API_KEY),
		"semantic-scholar": new SemanticScholarClient("https://api.semanticscholar.org/graph/v1", environment.SEMANTIC_SCHOLAR_API_KEY),
		openreview: new OpenReviewClient(),
		arxiv: new ArxivClient(),
	};
}

function chooseLookupProvider(identifier: string): ScholarlyProvider {
	if (/arxiv|^\d{4}\.\d{4,5}(?:v\d+)?$/i.test(identifier)) return "arxiv";
	if (/openalex|^W\d+$/i.test(identifier)) return "openalex";
	if (/semanticscholar|^[0-9a-f]{40}$/i.test(identifier)) return "semantic-scholar";
	if (/openreview\.net|^[A-Za-z0-9_-]{8,16}$/.test(identifier)) return "openreview";
	return "crossref";
}

export default function scholarlyExtension(pi: ExtensionAPI): void {
	const clients = createScholarlyClients();

	pi.registerTool({
		name: "scholarly_search",
		label: "Search scholarly metadata",
		description: "Search read-only scholarly metadata providers and return normalized, deduplicated records with publication-status provenance. Never put confidential project facts, unpublished results, sensitive values, or internal identifiers in an external query.",
		parameters: Type.Object({
			query: Type.String({ minLength: 2, maxLength: 500, description: "Public-safe scholarly search query." }),
			providers: Type.Optional(Type.Array(providerSchema, { minItems: 1, maxItems: 5 })),
			limitPerProvider: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, default: 10 })),
			offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000, default: 0, description: "Page offset; use a multiple of limitPerProvider for OpenAlex." })),
		}),
		async execute(_toolCallId, parameters) {
			const requested = [...new Set<ScholarlyProvider>(parameters.providers ?? ["crossref", "openalex", "semantic-scholar", "openreview", "arxiv"])];
			const records: ScholarlyRecord[] = [];
			const pages: Array<{ provider: ScholarlyProvider; next?: string | number; total?: number }> = [];
			const providerErrors: Array<{ provider: ScholarlyProvider; error: string }> = [];
			const results = await Promise.all(requested.map(async (provider) => {
				try {
					return { provider, page: await clients[provider].search(parameters.query, { limit: parameters.limitPerProvider ?? 10, offset: parameters.offset ?? 0 }) };
				} catch {
					return { provider, page: undefined };
				}
			}));
			// Preserve requested provider order, independent of network completion order.
			for (const { provider, page } of results) {
				if (!page) providerErrors.push({ provider, error: "Provider request failed; check availability, rate limits, configuration, and pagination. This is a coverage gap, not an empty search." });
				else { records.push(...page.records); pages.push({ provider, next: page.next, total: page.total }); }
			}
			return toolResult({ records: deduplicateRecords(records), pages, providerErrors });
		},
	});

	pi.registerTool({
		name: "scholarly_lookup",
		label: "Look up scholarly work",
		description: "Retrieve one scholarly metadata record by DOI or provider identifier. The result reports why its publication status was assigned.",
		parameters: Type.Object({
			identifier: Type.String({ minLength: 2, maxLength: 500 }),
			provider: Type.Optional(providerSchema),
		}),
		async execute(_toolCallId, parameters) {
			const provider = parameters.provider ?? chooseLookupProvider(parameters.identifier);
			const record = await clients[provider].lookup(parameters.identifier);
			return toolResult({ provider, record: record ?? null });
		},
	});

	pi.registerTool({
		name: "scholarly_neighbors",
		label: "Traverse scholarly graph",
		description: "Retrieve a bounded citation, reference, or related-work neighborhood using OpenAlex or Semantic Scholar. Use it for citation chaining; provider coverage is incomplete.",
		parameters: Type.Object({
			identifier: Type.String({ minLength: 2, maxLength: 500 }),
			provider: Type.Union([Type.Literal("openalex"), Type.Literal("semantic-scholar")]),
			relation: Type.Union([Type.Literal("citations"), Type.Literal("references"), Type.Literal("related")]),
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 30, default: 10 })),
			offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000, default: 0 })),
		}),
		async execute(_toolCallId, parameters) {
			const limit = parameters.limit ?? 10;
			if (parameters.provider === "semantic-scholar") {
				if (parameters.relation === "related") throw new Error("Semantic Scholar does not expose a related-work endpoint in this tool; use OpenAlex.");
				const page = await clients["semantic-scholar"].neighbors(parameters.identifier, parameters.relation, limit, parameters.offset ?? 0);
				return toolResult(page);
			}
			return toolResult(await clients.openalex.neighbors(parameters.identifier, parameters.relation, limit, parameters.offset ?? 0));
		},
	});
}

export type { ScholarlyClient, ScholarlyProvider, ScholarlyRecord } from "./types.ts";
