<script setup lang="ts">
import { reactive, ref } from "vue";

interface Company {
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
}

const filters = reactive({
	name: "",
	city: "",
	zipCode: "",
	naceCode: "",
	sicCode: "",
	revenueMin: "" as string,
	revenueMax: "" as string,
	capRatingMin: "" as string,
	capRatingMax: "" as string,
	creationDateMin: "",
	creationDateMax: "",
	employeesMin: "" as string,
	employeesMax: "" as string,
	hasWebsite: "" as "" | "true" | "false",
});

const companies = ref<Company[]>([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);

function buildBody(): Record<string, unknown> {
	const body: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(filters)) {
		if (v === "" || v == null) continue;
		if (k === "hasWebsite") {
			body[k] = v === "true";
		} else if (k.endsWith("Min") || k.endsWith("Max")) {
			if (k.startsWith("creationDate")) {
				body[k] = v;
			} else {
				const n = Number(v);
				if (Number.isFinite(n)) body[k] = n;
			}
		} else {
			body[k] = v;
		}
	}
	body.limit = 50;
	return body;
}

async function search() {
	loading.value = true;
	searched.value = true;
	try {
		const searchRes = await fetch("/api/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(buildBody()),
		});
		const { ids, total: t } = (await searchRes.json()) as { ids: string[]; total: number };
		total.value = t;

		if (ids.length === 0) {
			companies.value = [];
			return;
		}

		const listRes = await fetch("/api/list", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids }),
		});
		const { companies: docs } = (await listRes.json()) as { companies: Company[] };
		companies.value = docs;
	} finally {
		loading.value = false;
	}
}

function reset() {
	for (const k of Object.keys(filters) as Array<keyof typeof filters>) {
		(filters[k] as string) = "";
	}
	companies.value = [];
	total.value = 0;
	searched.value = false;
}

function formatNumber(n: number | undefined): string {
	if (n == null) return "—";
	return n.toLocaleString();
}

function formatRating(n: number | undefined): string {
	if (n == null) return "—";
	return n.toFixed(2);
}
</script>

<template>
	<h1>Capfi exercise — company search</h1>

	<div class="filters">
		<label class="field">
			Name
			<input v-model="filters.name" type="text" placeholder="starts with..." />
		</label>
		<label class="field">
			City
			<input v-model="filters.city" type="text" placeholder="exact" />
		</label>
		<label class="field">
			Zip code
			<input v-model="filters.zipCode" type="text" placeholder="exact" />
		</label>
		<label class="field">
			NACE code
			<input v-model="filters.naceCode" type="text" placeholder="exact" />
		</label>
		<label class="field">
			SIC code
			<input v-model="filters.sicCode" type="text" placeholder="exact" />
		</label>
		<div class="field">
			Revenue (€)
			<div class="field-range">
				<input v-model="filters.revenueMin" type="number" placeholder="min" />
				<input v-model="filters.revenueMax" type="number" placeholder="max" />
			</div>
		</div>
		<div class="field">
			Cap rating
			<div class="field-range">
				<input v-model="filters.capRatingMin" type="number" step="0.1" placeholder="min" />
				<input v-model="filters.capRatingMax" type="number" step="0.1" placeholder="max" />
			</div>
		</div>
		<div class="field">
			Creation date
			<div class="field-range">
				<input v-model="filters.creationDateMin" type="date" />
				<input v-model="filters.creationDateMax" type="date" />
			</div>
		</div>
		<div class="field">
			Employees
			<div class="field-range">
				<input v-model="filters.employeesMin" type="number" placeholder="min" />
				<input v-model="filters.employeesMax" type="number" placeholder="max" />
			</div>
		</div>
		<label class="field">
			Website
			<select v-model="filters.hasWebsite">
				<option value="">All</option>
				<option value="true">Has website</option>
				<option value="false">No website</option>
			</select>
		</label>
	</div>

	<div class="actions">
		<button :disabled="loading" @click="search">{{ loading ? "Searching..." : "Search" }}</button>
		<button class="secondary" :disabled="loading" @click="reset">Reset</button>
	</div>

	<p v-if="searched" class="summary">
		{{ total }} match{{ total === 1 ? "" : "es" }} — showing {{ companies.length }}
	</p>

	<div v-if="searched && companies.length === 0 && !loading" class="empty">No companies match these criteria.</div>

	<table v-if="companies.length">
		<thead>
			<tr>
				<th>ID</th>
				<th>Name</th>
				<th>City</th>
				<th>Zip</th>
				<th>NACE</th>
				<th>SIC</th>
				<th class="num">Revenue (€)</th>
				<th class="num">Cap rating</th>
				<th>Created</th>
				<th class="num">Employees</th>
				<th>Website</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="c in companies" :key="c._id">
				<td>{{ c._id }}</td>
				<td>{{ c.name }}</td>
				<td>{{ c.city }}</td>
				<td>{{ c.zipCode }}</td>
				<td>{{ c.naceCode }}</td>
				<td>{{ c.sicCode }}</td>
				<td class="num">{{ formatNumber(c.revenue) }}</td>
				<td class="num">{{ formatRating(c.capRating) }}</td>
				<td>{{ c.creationDate ?? "—" }}</td>
				<td class="num">{{ formatNumber(c.employees) }}</td>
				<td>
					<a v-if="c.website" :href="c.website" target="_blank" rel="noopener">{{ c.website }}</a>
					<span v-else>—</span>
				</td>
			</tr>
		</tbody>
	</table>
</template>