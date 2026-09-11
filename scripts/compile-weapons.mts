import { writeFile } from "node:fs/promises";
import path from "node:path";

import { buildWeaponsDataset } from "../src/lib/weapons/build";

async function main() {
	const dataset = await buildWeaponsDataset();

	const outputPath = path.join(process.cwd(), "data", "weapons.json");
	await writeFile(outputPath, JSON.stringify(dataset, null, "\t"), "utf8");

	console.log(`Wrote compiled weapons dataset: ${outputPath}`);
	console.log(
		[
			`${dataset.tierRows.length} rated weapons across ${dataset.categories.length} categories`,
			`${dataset.exotics.length} exotics`,
			`${dataset.archetypes.length} archetypes`,
			`${dataset.damageShots.length} damage rows`,
			`${dataset.sustained.length} sustained runs`,
			`${dataset.bosses.length} bosses`,
		].join(", "),
	);

	if (dataset.diagnostics.iconMisses.length > 0) {
		console.warn(
			`No manifest icon for ${dataset.diagnostics.iconMisses.length} weapons: ${dataset.diagnostics.iconMisses.slice(0, 20).join(", ")}`,
		);
	}
	if (dataset.diagnostics.archetypeMisses.length > 0) {
		console.warn(
			`No archetype row for ${dataset.diagnostics.archetypeMisses.length} frames: ${dataset.diagnostics.archetypeMisses.slice(0, 20).join(", ")}`,
		);
	}
	if (dataset.diagnostics.ambiguousArchetypes.length > 0) {
		console.warn(
			`Rated twice, so no ammo slot was assigned for ${dataset.diagnostics.ambiguousArchetypes.length} frames: ${dataset.diagnostics.ambiguousArchetypes.join(", ")}`,
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
