import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCompendiumDataset } from "./compendium";
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

export async function loadCompendiumDataset() {
	const compiled = await loadCompiledCompendiumDataset();
	if (compiled) return compiled;
	return buildCompendiumDataset();
}
