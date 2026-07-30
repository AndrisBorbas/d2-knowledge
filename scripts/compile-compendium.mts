import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildCompendiumDataset } from "../src/lib/sheet/compendium";

async function main() {
	const outputDir = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"compiled",
	);
	await mkdir(outputDir, { recursive: true });

	const dataset = await buildCompendiumDataset();
	const outputPath = path.join(outputDir, "compendium.json");
	await writeFile(outputPath, JSON.stringify(dataset, null, "\t"), "utf8");

	console.log(`Wrote compiled compendium dataset: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
