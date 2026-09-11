import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// The compiled datasets stay pretty-printed so regenerating them produces a
// readable diff. This writes the copies the browser actually downloads: same
// content, no indentation, which is ~1.6 MB of the compendium's 6.2 MB.
// Derived, so they are gitignored and regenerated before every dev run and
// build.
const DATASETS = [
	{
		label: "compendium",
		source: ["data", "compendium.json"],
		output: ["public", "assets", "data", "compendium.min.json"],
	},
	{
		label: "weapons",
		source: ["data", "weapons.json"],
		output: ["public", "assets", "data", "weapons.min.json"],
	},
];

async function main() {
	for (const dataset of DATASETS) {
		const sourcePath = path.join(process.cwd(), ...dataset.source);
		const outputPath = path.join(process.cwd(), ...dataset.output);

		let source: string;
		try {
			source = await readFile(sourcePath, "utf8");
		} catch {
			// The app falls back to building the dataset from source, so a missing
			// snapshot is not fatal here either.
			console.warn(`No compiled dataset at ${sourcePath}, skipping minify.`);
			continue;
		}

		// The output is gitignored, so on a fresh clone the directory is not there.
		await mkdir(path.dirname(outputPath), { recursive: true });
		await writeFile(outputPath, JSON.stringify(JSON.parse(source)), "utf8");
		console.log(`Wrote minified ${dataset.label} dataset: ${outputPath}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
