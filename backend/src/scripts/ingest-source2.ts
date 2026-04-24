import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { client, colls, type QueuedCommand, type Source2Doc } from "../db.ts";

const DEFAULT_PATH = resolve(import.meta.dirname, "../../../data/Entreprises2.csv");
const filePath = resolve(process.argv[2] ?? DEFAULT_PATH);

interface RawRow {
	"ID d'entreprise"?: string;
	"Nombre d'employés"?: string;
	"Site web"?: string;
	"Chiffre d'affaires (€)"?: string;
}

function toNumber(v: string | undefined): number | undefined {
	if (!v) return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

function rowToSource2(row: RawRow): Source2Doc | null {
	const id = row["ID d'entreprise"]?.trim();
	if (!id) return null;
	return {
		_id: id,
		employees: toNumber(row["Nombre d'employés"]),
		website: row["Site web"]?.trim() || undefined,
	};
}

console.log(`Reading ${filePath}`);
const csv = readFileSync(filePath, "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true }) as RawRow[];

const docs = rows.map(rowToSource2).filter((d): d is Source2Doc => d !== null);
console.log(`Parsed ${docs.length} valid rows (skipped ${rows.length - docs.length})`);

await client.connect();

console.log(`Upserting ${docs.length} docs into source2...`);
await colls.source2.bulkWrite(
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