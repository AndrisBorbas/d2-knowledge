import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// `compendium.json` stays pretty-printed so regenerating it produces a readable
// diff. This writes the copy the browser actually downloads: same content, no
// indentation, which is ~1.6 MB of the 6.2 MB. Derived, so it is gitignored and
// regenerated before every dev run and build.
const SOURCE_PATH = ["data", "compendium.json"];
const OUTPUT_PATH = ["public", "assets", "data", "compendium.min.json"];

async function main() {
	const sourcePath = path.join(process.cwd(), ...SOURCE_PATH);
	const outputPath = path.join(process.cwd(), ...OUTPUT_PATH);

	let source: string;
	try {
		source = await readFile(sourcePath, "utf8");
	} catch {
		// The app falls back to building the dataset from source, so a missing
		// snapshot is not fatal here either.
		console.warn(`No compiled dataset at ${sourcePath}, skipping minify.`);
		return;
	}

	// The output is gitignored, so on a fresh clone the directory is not there.
	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, JSON.stringify(JSON.parse(source)), "utf8");
	console.log(`Wrote minified compendium dataset: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
