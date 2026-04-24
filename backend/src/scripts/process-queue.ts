import { client, colls } from "../db.ts";
import { refreshCompany } from "../refresh-company.ts";

await client.connect();

const total = await colls.queuedCommands.countDocuments();
console.log(`Processing ${total} queued command(s)...`);

let processed = 0;
const cursor = colls.queuedCommands.find();
for await (const cmd of cursor) {
	await refreshCompany(cmd._id);
	await colls.queuedCommands.deleteOne({ _id: cmd._id });
	processed++;
	if (processed % 50 === 0) {
		console.log(`  ${processed}/${total}`);
	}
}

await client.close();
console.log(`Done. Processed ${processed} command(s).`);
