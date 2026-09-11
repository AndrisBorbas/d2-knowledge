import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
	type AegisSheetId,
	aegisSnapshotFileName,
	fetchAegisSheetSnapshot,
} from "../src/lib/aegis/snapshot";

const SHEET_IDS: AegisSheetId[] = ["endgame", "dps"];

async function main() {
	for (const id of SHEET_IDS) {
		const snapshot = await fetchAegisSheetSnapshot(id);
		const rowCount = Object.values(snapshot.grid).reduce(
			(total, rows) => total + rows.length,
			0,
		);

		const outputPath = path.join(
			process.cwd(),
			"data",
			aegisSnapshotFileName(id),
		);
		await writeFile(outputPath, JSON.stringify(snapshot, null, "\t"), "utf8");

		console.log(
			`Wrote ${id} sheet: ${outputPath} (${Object.keys(snapshot.grid).length} tabs, ${rowCount} rows)`,
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
