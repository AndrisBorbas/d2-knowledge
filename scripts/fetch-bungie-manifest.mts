import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
	DEFAULT_MANIFEST_TABLES,
	fetchDestinyManifestTables,
} from "../src/lib/bungie/manifest";

async function main() {
	const outputDir = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"compiled",
	);
	await mkdir(outputDir, { recursive: true });

	const snapshot = await fetchDestinyManifestTables(DEFAULT_MANIFEST_TABLES);
	const outputPath = path.join(outputDir, "bungie-manifest.json");
	await writeFile(
		outputPath,
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				tableNames: DEFAULT_MANIFEST_TABLES,
				manifestVersion: snapshot.manifest.version,
				manifestPath: snapshot.manifest.mobileWorldContentPaths?.en ?? null,
				tables: snapshot.tables,
			},
			null,
			2,
		),
		"utf8",
	);

	console.log(`Wrote Bungie manifest snapshot: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
