import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCompendiumDataset } from "./build";
import { type CompendiumDataset, compendiumDatasetSchema } from "./model";

export async function loadCompiledCompendiumDataset() {
	const filePath = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"compiled",
		"compendium.json",
	);

	try {
		const json = await readFile(filePath, "utf8");
		return compendiumDatasetSchema.parse(JSON.parse(json) as CompendiumDataset);
	} catch {
		return null;
	}
}

async function readCompendiumDataset() {
	const compiled = await loadCompiledCompendiumDataset();
	if (compiled) return compiled;
	return buildCompendiumDataset();
}

// The compiled dataset is ~5 MB of JSON that has to be zod-parsed. Several
// routes plus the root layout ask for it, so keep one promise per server
// process instead of re-reading per call.
let cachedDataset: Promise<CompendiumDataset> | null = null;

export function loadCompendiumDataset() {
	cachedDataset ??= readCompendiumDataset().catch((error: unknown) => {
		// Don't let a transient failure poison every later request.
		cachedDataset = null;
		throw error;
	});
	return cachedDataset;
}
