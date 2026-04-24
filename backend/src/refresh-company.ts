import { colls } from "./db.ts";

/**
 * Rebuild a single `companies` document by reading every source collection
 * for the given id and merging the results. Deletes the document if no
 * source has data for this id.
 */

export async function refreshCompany(id: string): Promise<void> {
	const [s1, s2] = await Promise.all([
		colls.source1.findOne({ _id: id }),
		colls.source2.findOne({ _id: id }),
	]);

	if (!s1 && !s2) {
		await colls.companies.deleteOne({ _id: id });
		return;
	}

	await colls.companies.replaceOne(
		{ _id: id },
		{
			name: s1?.name,
			address: s1?.address,
			zipCode: s1?.zipCode,
			city: s1?.city,
			country: s1?.country,
			revenue: s1?.revenue ?? undefined,
			capRating: s1?.capRating,
			naceCode: s1?.naceCode,
			sicCode: s1?.sicCode,
			creationDate: s1?.creationDate,
			employees: s2?.employees,
			website: s2?.website,
			hasWebsite: !!s2?.website,
			updatedAt: new Date(),
		},
		{ upsert: true }
	);
}