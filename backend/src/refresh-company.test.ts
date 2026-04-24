import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSource1 = vi.fn();
const mockSource2 = vi.fn();
const mockReplaceOne = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock("./db.ts", () => ({
	colls: {
		source1: { findOne: mockSource1 },
		source2: { findOne: mockSource2 },
		companies: { replaceOne: mockReplaceOne, deleteOne: mockDeleteOne },
	},
}));

const { refreshCompany } = await import("./refresh-company.ts");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("refreshCompany", () => {
	it("merge source1 et source2 correctement", async () => {
		mockSource1.mockResolvedValue({ _id: "FR123", name: "ACME", revenue: 1000000 });
		mockSource2.mockResolvedValue({ _id: "FR123", employees: 500, website: "http://acme.com" });

		await refreshCompany("FR123");

		expect(mockReplaceOne).toHaveBeenCalledWith(
			{ _id: "FR123" },
			expect.objectContaining({
				name: "ACME",
				employees: 500,
				website: "http://acme.com",
				hasWebsite: true,
			}),
			{ upsert: true }
		);
	});

	it("hasWebsite est false si website est absent", async () => {
		mockSource1.mockResolvedValue({ _id: "FR123", name: "ACME" });
		mockSource2.mockResolvedValue({ _id: "FR123", employees: 10, website: undefined });

		await refreshCompany("FR123");

		expect(mockReplaceOne).toHaveBeenCalledWith(
			{ _id: "FR123" },
			expect.objectContaining({ hasWebsite: false }),
			{ upsert: true }
		);
	});

	it("fonctionne avec source1 seul", async () => {
		mockSource1.mockResolvedValue({ _id: "FR123", name: "ACME" });
		mockSource2.mockResolvedValue(null);

		await refreshCompany("FR123");

		expect(mockReplaceOne).toHaveBeenCalled();
		expect(mockDeleteOne).not.toHaveBeenCalled();
	});

	it("fonctionne avec source2 seul", async () => {
		mockSource1.mockResolvedValue(null);
		mockSource2.mockResolvedValue({ _id: "FR123", employees: 50 });

		await refreshCompany("FR123");

		expect(mockReplaceOne).toHaveBeenCalled();
		expect(mockDeleteOne).not.toHaveBeenCalled();
	});

	it("supprime le document si aucune source n'a de données", async () => {
		mockSource1.mockResolvedValue(null);
		mockSource2.mockResolvedValue(null);

		await refreshCompany("FR123");

		expect(mockDeleteOne).toHaveBeenCalledWith({ _id: "FR123" });
		expect(mockReplaceOne).not.toHaveBeenCalled();
	});
});