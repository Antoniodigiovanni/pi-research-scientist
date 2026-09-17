import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ZoteroClient } from "./client.ts";

const execFileAsync = promisify(execFile);

export type PdfCommand = (file: string, args: string[], signal?: AbortSignal) => Promise<{ stdout: string }>;

async function defaultPdfCommand(file: string, args: string[], signal?: AbortSignal): Promise<{ stdout: string }> {
	try {
		const result = await execFileAsync(file, args, { signal, timeout: 30_000, maxBuffer: 10_000_000, windowsHide: true });
		return { stdout: result.stdout };
	} catch {
		throw new Error("Local PDF extraction failed; install pdftotext and confirm the Zotero attachment is available");
	}
}

function localFilePath(value: string): string {
	let url: URL;
	try { url = new URL(value); } catch { throw new Error("Zotero returned an invalid attachment file URL"); }
	if (url.protocol !== "file:" || url.username || url.password || url.search || url.hash || url.hostname) {
		throw new Error("Zotero attachment extraction requires a local file URL");
	}
	return fileURLToPath(url);
}

export async function extractPdfText(
	client: ZoteroClient,
	attachmentKey: string,
	signal?: AbortSignal,
	run: PdfCommand = defaultPdfCommand,
): Promise<string> {
	if (signal?.aborted) throw new Error("PDF extraction was cancelled");
	const item = await client.getItem(attachmentKey, signal);
	const type = item.data.contentType?.toLowerCase();
	if (item.data.itemType !== "attachment" || (type !== "application/pdf" && !item.data.filename?.toLowerCase().endsWith(".pdf"))) {
		throw new Error("Zotero item is not a PDF attachment");
	}
	const path = localFilePath(await client.getAttachmentFileUrl(attachmentKey, signal));
	const result = await run("pdftotext", [path, "-"], signal);
	if (result.stdout.length > 10_000_000) throw new Error("Extracted PDF text exceeds the local safety bound");
	return result.stdout;
}
