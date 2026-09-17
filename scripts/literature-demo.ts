import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { ScholarlyRecord } from "../extensions/scholarly/types.ts";

const SYNTHETIC_RECORDS: ScholarlyRecord[] = [
	{
		title: "Synthetic benchmark for shift-aware evaluation",
		authors: [{ name: "Ada Example" }, { name: "Lin Sample" }],
		year: 2026,
		venue: "Synthetic Research Workshop",
		type: "conference-paper",
		identifiers: { doi: "10.0000/synthetic.001" },
		publicationStatus: "published",
		statusEvidence: { status: "published", source: "crossref", reason: "Synthetic fixture: pretend deposited metadata." },
		provenance: [{ provider: "crossref", providerId: "10.0000/synthetic.001", retrievedAt: "2026-01-01T00:00:00.000Z" }],
	},
	{
		title: "Robust evaluation under synthetic temporal drift",
		authors: [{ name: "Mina Fixture" }],
		year: 2025,
		type: "preprint",
		identifiers: { arxiv: "2501.00001" },
		publicationStatus: "preprint",
		statusEvidence: { status: "preprint", source: "arxiv", reason: "Synthetic fixture: pretend arXiv-only record." },
		provenance: [{ provider: "arxiv", providerId: "2501.00001", retrievedAt: "2026-01-01T00:00:00.000Z" }],
	},
];

const COLUMNS = [
	"citation key", "title", "authors", "year", "venue", "publication status", "DOI/identifier",
	"research question", "central claim", "method", "dataset", "baselines", "metrics", "main result",
	"limitations", "novelty overlap", "relation to our work", "follow-up opportunity", "evidence status",
] as const;

function csvCell(value: unknown): string {
	const text = String(value ?? "");
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function evidenceRow(record: ScholarlyRecord, index: number): string[] {
	return [
		`synthetic-${index + 1}`,
		record.title,
		record.authors.map((author) => author.name).join("; "),
		record.year,
		record.venue,
		record.publicationStatus,
		record.identifiers.doi ?? record.identifiers.arxiv,
		"How should models be evaluated under distribution shift?",
		"Synthetic fixture claim; not research evidence.",
		"Synthetic fixture",
		"No real dataset",
		"None",
		"Illustrative metric",
		"No empirical result",
		"Synthetic metadata only",
		"To assess",
		"Demonstrates the evidence workflow only",
		"Replace with verified sources",
		"synthetic-unverified",
	].map(csvCell);
}

export async function runSyntheticLiteratureDemo(outputDirectory: string): Promise<void> {
	const literatureDirectory = path.join(outputDirectory, "literature");
	await mkdir(literatureDirectory, { recursive: true });
	const matrix = [COLUMNS.map(csvCell).join(","), ...SYNTHETIC_RECORDS.map((record, index) => evidenceRow(record, index).join(","))].join("\n") + "\n";
	// Demonstrations must never replace a real project's research evidence.
	await writeFile(path.join(literatureDirectory, "evidence-matrix.csv"), matrix, { encoding: "utf8", flag: "wx" });
	const logEntry = [
		"## 2026-01-01T00:00:00.000Z — synthetic demonstration",
		"",
		"- Question: How should models be evaluated under distribution shift?",
		"- Query: `synthetic temporal distribution shift evaluation`",
		"- Source/provider: synthetic fixtures (no network request)",
		"- Filters: none",
		"- Why: demonstrate durable evidence capture",
		"- Key results: two explicitly synthetic records were normalized into the evidence matrix",
		"- Follow-up: replace fixtures with multiple live-provider searches and citation chaining",
		"",
	].join("\n");
	await appendFile(path.join(literatureDirectory, "search-log.md"), logEntry, "utf8");
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
	const outputDirectory = path.resolve(process.argv[2] ?? "examples/literature-demo");
	await runSyntheticLiteratureDemo(outputDirectory);
	console.log(`Wrote synthetic literature artifacts under ${outputDirectory}`);
}
