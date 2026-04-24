import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { client, colls, type QueuedCommand, type Source1Doc } from "../db.ts";

const DEFAULT_PATH = resolve(import.meta.dirname, "../../../data/Entreprises1.csv");
const filePath = resolve(process.argv[2] ?? DEFAULT_PATH);

interface RawRow {
	"ID d'entreprise"?: string;
	"Raison sociale"?: string;
	Adresse?: string;
	"Code postal"?: string;
	Ville?: string;
	Pays?: string;
	"Chiffre d'affaires (€)"?: string;
	"Cap Rating"?: string;
	"Code NACE"?: string;
	"Code SIC"?: string;
	"Date de création"?: string;
}

function toNumber(v: string | undefined): number | undefined {
	if (!v) {
		return undefined;
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

/** "30/11/1954" → "1954-11-30" (lex-sortable). */
function frenchDateToIso(d: string | undefined): string | undefined {
	if (!d) {
		return undefined;
	}
	const m = d.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (!m) {
		return undefined;
	}
	return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function rowToSource1(row: RawRow): Source1Doc | null {
	const id = row["ID d'entreprise"]?.trim();
	const name = row["Raison sociale"]?.trim();
	if (!id || !name) {
		return null;
	}
	return {
		_id: id,
		name,
		address: row.Adresse?.trim() || undefined,
		zipCode: row["Code postal"]?.trim() || undefined,
		city: row.Ville?.trim() || undefined,
		country: row.Pays?.trim() || undefined,
		revenue: toNumber(row["Chiffre d'affaires (€)"]),
		capRating: toNumber(row["Cap Rating"]),
		naceCode: row["Code NACE"]?.trim() || undefined,
		sicCode: row["Code SIC"]?.trim() || undefined,
		creationDate: frenchDateToIso(row["Date de création"]),
	};
}

console.log(`Reading ${filePath}`);
const csv = readFileSync(filePath, "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true }) as RawRow[];

const docs = rows.map(rowToSource1).filter((d): d is Source1Doc => d !== null);
console.log(`Parsed ${docs.length} valid rows (skipped ${rows.length - docs.length})`);

await client.connect();

console.log(`Upserting ${docs.length} docs into source1...`);
await colls.source1.bulkWrite(
	docs.map((d) => ({
		replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
	})),
	{ ordered: false }
);

const now = new Date();
console.log(`Queuing ${docs.length} company-refresh commands...`);
await colls.queuedCommands.bulkWrite(
	docs.map((d) => ({
		updateOne: {
			filter: { _id: d._id },
			update: { $setOnInsert: { type: "company-refresh", createdAt: now } satisfies Omit<QueuedCommand, "_id"> },
			upsert: true,
		},
	})),
	{ ordered: false }
);

await client.close();
console.log("Done.");
