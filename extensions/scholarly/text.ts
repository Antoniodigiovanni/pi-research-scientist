export function boundedText(value: unknown, maxCharacters = 4_000): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.replace(/\s+/g, " ").trim();
	if (!normalized) return undefined;
	return normalized.length <= maxCharacters ? normalized : `${normalized.slice(0, maxCharacters - 1)}…`;
}

export function normalizeDoi(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const doi = value.trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
	return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : undefined;
}

export function normalizeArxivId(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const id = value
		.trim()
		.replace(/^arxiv:/i, "")
		.replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, "")
		.replace(/\.pdf$/i, "")
		.replace(/v\d+$/i, "");
	return /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z-]+)?\/\d{7})$/i.test(id) ? id.toLowerCase() : undefined;
}

export function normalizeTitle(value: string): string {
	return value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function decodeXml(value: string): string {
	return value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
		.replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

export function stripMarkup(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	return boundedText(decodeXml(value.replace(/<[^>]*>/g, " ")));
}
