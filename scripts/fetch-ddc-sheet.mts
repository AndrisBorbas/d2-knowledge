import { writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchDdcSheetSnapshot } from "../src/lib/ddc/snapshot";

async function main() {
	const snapshot = await fetchDdcSheetSnapshot();

	const rowCount = Object.values(snapshot.grid).reduce(
		(total, rows) => total + rows.length,
		0,
	);

	const outputPath = path.join(process.cwd(), "data", "ddc-sheet.json");
	await writeFile(outputPath, JSON.stringify(snapshot, null, "\t"), "utf8");

	console.log(
		`Wrote Destiny Data Compendium sheet: ${outputPath} (${Object.keys(snapshot.tabIds).length} tabs, ${rowCount} rows, ${snapshot.colors.length} colored cells)`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
