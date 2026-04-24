import { MongoClient } from "mongodb";

export interface Source1Doc {
	_id: string;
	name: string;
	address?: string;
	zipCode?: string;
	city?: string;
	country?: string;
	revenue?: number;
	capRating?: number;
	naceCode?: string;
	sicCode?: string;
	creationDate?: string;
}

export interface Source2Doc {
	_id: string;
	employees?: number;
	website?: string;
}

export interface Company {
	_id: string;
	name?: string;
	address?: string;
	zipCode?: string;
	city?: string;
	country?: string;
	revenue?: number;
	capRating?: number;
	naceCode?: string;
	sicCode?: string;
	creationDate?: string;
	employees?: number;
	website?: string;
	hasWebsite: boolean;
	updatedAt: Date;
}

export interface QueuedCommand {
	_id: string;
	type: "company-refresh";
	createdAt: Date;
}

const MONGO_URL = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME ?? "capfi-exercise";

export const client = new MongoClient(MONGO_URL);
const db = client.db(DB_NAME);

export const colls = {
	source1: db.collection<Source1Doc>("source1"),
	source2: db.collection<Source2Doc>("source2"),
	queuedCommands: db.collection<QueuedCommand>("queuedCommands"),
	companies: db.collection<Company>("companies"),
};

export async function ensureIndexes(): Promise<void> {
	await colls.companies.createIndexes([
		{ key: { revenue: -1 } },
		{ key: { name: 1 } },
		{ key: { city: 1, revenue: -1 } },
		{ key: { zipCode: 1, revenue: -1 } },
		{ key: { naceCode: 1, revenue: -1 } },
		{ key: { sicCode: 1, revenue: -1 } },
		{ key: { capRating: 1 } },
		{ key: { creationDate: 1 } },
		{ key: { hasWebsite: 1, revenue: -1 } },
		{ key: { employees: 1 } },
	]);
}