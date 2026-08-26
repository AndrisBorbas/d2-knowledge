import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildCompendiumDataset } from "../src/lib/compendium/build";

async function main() {
	const outputDir = path.join(process.cwd(), "data");
	await mkdir(outputDir, { recursive: true });

	const dataset = await buildCompendiumDataset();
	const outputPath = path.join(outputDir, "compendium.json");
	// Pretty-printed on purpose: this is the file that gets committed, so a
	// regenerated dataset should diff readably. `data:minify` derives the copy
	// the browser downloads.
	await writeFile(outputPath, JSON.stringify(dataset, null, "\t"), "utf8");

	console.log(`Wrote compiled compendium dataset: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
