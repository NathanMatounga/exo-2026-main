import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { Filter } from "mongodb";
import { client, colls, ensureIndexes, type Company } from "./db.ts";

await client.connect();
await ensureIndexes();

interface SearchBody {
	name?: string;
	city?: string;
	zipCode?: string;
	naceCode?: string;
	sicCode?: string;
	revenueMin?: number;
	revenueMax?: number;
	capRatingMin?: number;
	capRatingMax?: number;
	creationDateMin?: string;
	creationDateMax?: string;
	employeesMin?: number;
	employeesMax?: number;
	hasWebsite?: boolean;
	limit?: number;
	skip?: number;
}

function buildSearchFilter(body: SearchBody): Filter<Company> {
	const filter: Filter<Company> = {};

	if (body.name) {
		filter.name = { $regex: `^${escapeRegex(body.name.toUpperCase())}` };
	}
	if (body.city) {
		filter.city = body.city.toUpperCase();
	}
	if (body.zipCode) {
		filter.zipCode = body.zipCode;
	}
	if (body.naceCode) {
		filter.naceCode = body.naceCode;
	}
	if (body.sicCode) {
		filter.sicCode = body.sicCode;
	}
	if (body.hasWebsite !== undefined) {
		filter.hasWebsite = body.hasWebsite;
	}

	addRange(filter, "revenue", body.revenueMin, body.revenueMax);
	addRange(filter, "capRating", body.capRatingMin, body.capRatingMax);
	addRange(filter, "creationDate", body.creationDateMin, body.creationDateMax);
	addRange(filter, "employees", body.employeesMin, body.employeesMax);

	return filter;
}

function addRange<T extends number | string>(
	filter: Filter<Company>,
	key: keyof Company,
	min: T | undefined,
	max: T | undefined
): void {
	if (min == null && max == null) return;
	const range: Record<string, T> = {};
	if (min != null) range.$gte = min;
	if (max != null) range.$lte = max;
	(filter as Record<string, unknown>)[key as string] = range;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const app = new Hono();

app.use("*", cors());

app.post("/api/search", async (c) => {
	const body = (await c.req.json()) as SearchBody;
	const filter = buildSearchFilter(body);

	const limit = Math.min(Math.max(body.limit ?? 20, 1), 100);
	const skip = Math.max(body.skip ?? 0, 0);

	const [docs, total] = await Promise.all([
		colls.companies
			.find(filter, { projection: { _id: 1 } })
			.sort({ revenue: -1 })
			.skip(skip)
			.limit(limit)
			.toArray(),
		colls.companies.countDocuments(filter),
	]);

	return c.json({ ids: docs.map((d) => d._id), total });
});

app.post("/api/list", async (c) => {
	const { ids } = (await c.req.json()) as { ids?: string[] };
	if (!Array.isArray(ids) || ids.length === 0) {
		return c.json({ companies: [] });
	}
	const docs = await colls.companies.find({ _id: { $in: ids } }).toArray();
	const byId = new Map(docs.map((d) => [d._id, d]));
	return c.json({ companies: ids.map((id) => byId.get(id)).filter(Boolean) });
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Server listening on http://localhost:${info.port}`);
});