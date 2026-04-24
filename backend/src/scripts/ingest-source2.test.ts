import { describe, it, expect } from "vitest";

interface RawRow {
	"ID d'entreprise"?: string;
	"Nombre d'employés"?: string;
	"Site web"?: string;
}

interface Source2Doc {
	_id: string;
	employees?: number;
	website?: string;
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

describe("rowToSource2", () => {
	it("parse une ligne complète correctement", () => {
		const result = rowToSource2({
			"ID d'entreprise": "FR123",
			"Nombre d'employés": "500",
			"Site web": "http://example.com",
		});
		expect(result).toEqual({ _id: "FR123", employees: 500, website: "http://example.com" });
	});

	it("retourne null si l'ID est absent", () => {
		const result = rowToSource2({ "Nombre d'employés": "500", "Site web": "http://example.com" });
		expect(result).toBeNull();
	});

	it("ignore un website vide", () => {
		const result = rowToSource2({ "ID d'entreprise": "FR123", "Site web": "" });
		expect(result?.website).toBeUndefined();
	});

	it("ignore un nombre d'employés manquant", () => {
		const result = rowToSource2({ "ID d'entreprise": "FR123" });
		expect(result?.employees).toBeUndefined();
	});

	it("ignore un nombre d'employés invalide", () => {
		const result = rowToSource2({ "ID d'entreprise": "FR123", "Nombre d'employés": "abc" });
		expect(result?.employees).toBeUndefined();
	});

	it("ignore Tranche effectifs implicitement (pas dans le type)", () => {
		const row = {
			"ID d'entreprise": "FR123",
			"Nombre d'employés": "100",
			"Tranche effectifs": "De 50 à 99 salariés",
			"Site web": "http://example.com",
		} as RawRow;
		const result = rowToSource2(row);
		expect(result).not.toHaveProperty("trancheEffectifs");
		expect(result).not.toHaveProperty("Tranche effectifs");
	});
});