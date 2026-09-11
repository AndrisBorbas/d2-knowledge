import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildWeaponsDataset } from "./build";
import { type WeaponsDataset, weaponsDatasetSchema } from "./model";

export async function loadCompiledWeaponsDataset() {
	// The pretty-printed source, kept out of public/ so only the derived
	// weapons.min.json is deployed. Literal segments, not a spread: Next traces
	// filesystem access statically.
	const filePath = path.join(process.cwd(), "data", "weapons.json");

	try {
		const json = await readFile(filePath, "utf8");
		return weaponsDatasetSchema.parse(JSON.parse(json) as WeaponsDataset);
	} catch {
		return null;
	}
}

async function readWeaponsDataset() {
	const compiled = await loadCompiledWeaponsDataset();
	if (compiled) return compiled;
	// Safe as a fallback in a way the compendium's is not: building this one
	// reads committed snapshots only, never the network.
	return buildWeaponsDataset();
}

let cachedDataset: Promise<WeaponsDataset> | null = null;

export function loadWeaponsDataset() {
	cachedDataset ??= readWeaponsDataset().catch((error: unknown) => {
		// Don't let a transient failure poison every later request.
		cachedDataset = null;
		throw error;
	});
	return cachedDataset;
}
