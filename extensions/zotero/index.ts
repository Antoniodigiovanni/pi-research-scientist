import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { chunkText, toolResult } from "../../src/text.ts";
import { BetterBibtexClient, createBetterBibtexClient } from "./better-bibtex.ts";
import { createZoteroClient, ZoteroClient } from "./client.ts";
import { extractPdfText } from "./pdf.ts";
import { loadToolPolicy } from "../../src/policy.ts";

async function checkPolicy(ctx: ExtensionContext): Promise<void> {
	const policy = await loadToolPolicy(ctx);
	if (!policy.data_policy.allow_schema_metadata) throw new Error("Zotero access is disabled by project metadata policy");
	// Item/search/export responses may include private notes, annotations or abstracts.
	// We cannot classify an entire desktop library automatically.
	if (policy.project.type === "internal" && !policy.data_policy.raw_data_to_model) {
		throw new Error("Internal Zotero access requires explicit raw_data_to_model approval for library content and an approved model; use a separate public project/library for public papers");
	}
}

const key = Type.String({ pattern: "^[A-Z0-9]{8}$", description: "Eight-character Zotero item or collection key." });
const chunk = {
	offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000_000, default: 0 })),
	limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 20_000, default: 8_000 })),
};

export async function writeProjectReferences(cwd: string, source: string, overwrite: boolean): Promise<string> {
	const root = await realpath(cwd);
	const paper = await realpath(join(root, "paper"));
	if (relative(root, paper).startsWith("..")) throw new Error("Project paper directory resolves outside the working directory");
	const target = resolve(paper, "references.bib");
	try {
		const status = await lstat(target);
		if (status.isSymbolicLink()) throw new Error("Refusing to write references through a symbolic link");
		if (!overwrite) throw new Error("paper/references.bib already exists; set overwrite only after reviewing existing references");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	const flags = constants.O_WRONLY | constants.O_CREAT | (overwrite ? constants.O_TRUNC : constants.O_EXCL) | constants.O_NOFOLLOW;
	const handle = await open(target, flags, 0o600);
	try { await handle.writeFile(source, "utf8"); } finally { await handle.close(); }
	return target;
}

export default function zoteroExtension(pi: ExtensionAPI): void {
	const zotero = (): ZoteroClient => createZoteroClient();
	const bbt = (): BetterBibtexClient => createBetterBibtexClient();

	pi.registerTool({
		name: "zotero_search",
		label: "Search local Zotero",
		description: "Search the local Zotero library with read-only API v3. Queries may inspect indexed full text locally; do not copy confidential results into external web searches.",
		parameters: Type.Object({
			query: Type.String({ minLength: 1, maxLength: 500 }),
			includeFullText: Type.Optional(Type.Boolean({ default: false })),
			itemType: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
			tag: Type.Optional(Type.String({ minLength: 1, maxLength: 1_000 })),
			collectionKey: Type.Optional(key),
			start: Type.Optional(Type.Integer({ minimum: 0, maximum: 1_000_000, default: 0 })),
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 25 })),
		}),
		async execute(_id, parameters, signal, _update, ctx) {
			await checkPolicy(ctx);
			return toolResult(await zotero().searchItems(parameters, signal));
		},
	});

	pi.registerTool({
		name: "zotero_get_item",
		label: "Get Zotero item",
		description: "Read bounded local Zotero item metadata, including attachment, note, and annotation fields when present.",
		parameters: Type.Object({ itemKey: key }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult(await zotero().getItem(parameters.itemKey, signal)); },
	});

	pi.registerTool({
		name: "zotero_get_children",
		label: "Get Zotero child items",
		description: "Read a Zotero item's child attachments, notes, and annotations without modifying the library.",
		parameters: Type.Object({ itemKey: key, start: Type.Optional(Type.Integer({ minimum: 0, maximum: 1_000_000 })), limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })) }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult(await zotero().getChildren(parameters.itemKey, signal, parameters.start, parameters.limit)); },
	});

	pi.registerTool({
		name: "zotero_list_collections",
		label: "List Zotero collections",
		description: "List bounded local Zotero collection metadata.",
		parameters: Type.Object({
			start: Type.Optional(Type.Integer({ minimum: 0, maximum: 1_000_000, default: 0 })),
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
		}),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult(await zotero().listCollections(parameters.start, parameters.limit, signal)); },
	});

	pi.registerTool({
		name: "zotero_get_collection",
		label: "Get Zotero collection",
		description: "Read one local Zotero collection by key.",
		parameters: Type.Object({ collectionKey: key }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult(await zotero().getCollection(parameters.collectionKey, signal)); },
	});

	pi.registerTool({
		name: "zotero_read_fulltext",
		label: "Read indexed Zotero text",
		description: "Read a bounded chunk of Zotero's locally indexed attachment text. The returned text enters the current model context.",
		parameters: Type.Object({ attachmentKey: key, ...chunk }),
		async execute(_id, parameters, signal, _update, ctx) {
			await checkPolicy(ctx);
			const value = await zotero().getFullText(parameters.attachmentKey, signal);
			return toolResult({ attachmentKey: parameters.attachmentKey, ...chunkText(value.content, parameters.offset, parameters.limit), indexing: { indexedPages: value.indexedPages, totalPages: value.totalPages, indexedCharacters: value.indexedCharacters, totalCharacters: value.totalCharacters } });
		},
	});

	pi.registerTool({
		name: "zotero_extract_pdf",
		label: "Extract local Zotero PDF",
		description: "Run local pdftotext with an attachment path supplied by Zotero, then return one bounded text chunk. No document is uploaded.",
		parameters: Type.Object({ attachmentKey: key, ...chunk }),
		async execute(_id, parameters, signal, _update, ctx) {
			await checkPolicy(ctx);
			const text = await extractPdfText(zotero(), parameters.attachmentKey, signal);
			return toolResult({ attachmentKey: parameters.attachmentKey, source: "local-pdftotext", ...chunkText(text, parameters.offset, parameters.limit) });
		},
	});

	pi.registerTool({
		name: "better_bibtex_search",
		label: "Search Better BibTeX",
		description: "Search Better BibTeX; exactCitationKey resolves one unambiguous personal-library citation key to a Zotero itemKey for notes, attachments and full text.",
		parameters: Type.Object({ query: Type.String({ minLength: 1, maxLength: 500 }), exactCitationKey: Type.Optional(Type.Boolean({ default: false })) }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult({ result: parameters.exactCitationKey ? await bbt().lookup(parameters.query, signal) : await bbt().search(parameters.query, signal) }); },
	});

	pi.registerTool({
		name: "better_bibtex_citation_keys",
		label: "Get Better BibTeX keys",
		description: "Read Better BibTeX citation keys for Zotero item keys.",
		parameters: Type.Object({ itemKeys: Type.Array(key, { minItems: 1, maxItems: 200 }) }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult({ citationKeys: await bbt().citationKeys(parameters.itemKeys, signal) }); },
	});

	pi.registerTool({
		name: "better_bibtex_bibliography",
		label: "Render bibliography",
		description: "Render a bibliography through the optional Better BibTeX read-only JSON-RPC interface.",
		parameters: Type.Object({ citationKeys: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { minItems: 1, maxItems: 500 }), format: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })) }),
		async execute(_id, parameters, signal, _update, ctx) { await checkPolicy(ctx); return toolResult({ bibliography: await bbt().bibliography(parameters.citationKeys, parameters.format, signal) }); },
	});

	pi.registerTool({
		name: "better_bibtex_export",
		label: "Export project references",
		description: "Export selected Better BibTeX citation keys. Optionally write only paper/references.bib in the current project; Zotero is never modified.",
		parameters: Type.Object({
			citationKeys: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { minItems: 1, maxItems: 500 }),
			format: Type.Union([Type.Literal("bibtex"), Type.Literal("biblatex")]),
			...chunk,
			writeToProject: Type.Optional(Type.Boolean({ default: false })),
			overwrite: Type.Optional(Type.Boolean({ default: false })),
		}),
		async execute(_id, parameters, signal, _update, ctx) {
			await checkPolicy(ctx);
			const source = await bbt().export(parameters.citationKeys, parameters.format, signal);
			const path = parameters.writeToProject ? await writeProjectReferences(ctx.cwd, source, parameters.overwrite ?? false) : undefined;
			return toolResult({ format: parameters.format, source: chunkText(source, parameters.offset, parameters.limit), written: path ? "paper/references.bib" : null });
		},
	});
}

export { BetterBibtexClient, createBetterBibtexClient } from "./better-bibtex.ts";
export { createZoteroClient, ZoteroClient } from "./client.ts";
export { extractPdfText } from "./pdf.ts";
