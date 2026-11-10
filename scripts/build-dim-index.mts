import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CompactGearRow } from "../src/lib/bungie/gear-schema";
import {
	ASPECT_ENERGY_CAPACITY_STAT,
	type CompactStatMod,
	type CompactSubclassRow,
	FRAGMENT_COST_STAT,
} from "../src/lib/bungie/subclass-schema";
import type {
	DimIndex,
	DimIndexGear,
	DimIndexItem,
	DimIndexSet,
	DimIndexStatMod,
	DimIndexSubclass,
} from "../src/lib/dim/index-schema";

// Writes the hash lookup the build inspector fetches. It is derived from the
// manifest snapshot, so like the minified datasets it is gitignored and rebuilt
// before every dev run and build.
const SOURCE_PATH = ["data", "bungie-manifest.json"];
const OUTPUT_PATH = ["public", "assets", "data", "dim-index.min.json"];

type ManifestRow = {
	n?: string;
	i?: string;
	d?: string;
	// Subclass aspects and fragments only.
	st?: CompactStatMod[];
};

type ManifestItemSetRow = ManifestRow & {
	sp?: { c: number; h: number }[];
};

type ManifestSnapshot = {
	generatedAt?: string;
	tables?: {
		DestinyInventoryItemDefinition?: Record<string, ManifestRow>;
		DestinyStatDefinition?: Record<string, ManifestRow>;
		DestinyEquipableItemSetDefinition?: Record<string, ManifestItemSetRow>;
		Subclasses?: Record<string, CompactSubclassRow>;
		// Absent from snapshots written before the build inspector existed, until
		// the next `bun run data:bungie:snapshot`.
		Gear?: Record<string, CompactGearRow>;
	};
};

// The two stats that describe the slot rather than the item are lifted out
// (see subclass-schema.ts), and the rest become the lines printed under a
// fragment's name.
function readSubclassStats(
	stats: CompactStatMod[] | undefined,
	statTable: Record<string, ManifestRow> | undefined,
) {
	let fragmentSlots: number | undefined;
	const statMods: DimIndexStatMod[] = [];

	for (const stat of stats ?? []) {
		if (stat.h === ASPECT_ENERGY_CAPACITY_STAT) {
			fragmentSlots = stat.v;
			continue;
		}
		if (stat.h === FRAGMENT_COST_STAT) continue;

		const statName = statTable?.[String(stat.h)]?.n;
		if (statName) statMods.push({ n: statName, v: stat.v });
	}

	return { fragmentSlots, statMods };
}

function buildItems(
	table: Record<string, ManifestRow> | undefined,
	statTable: Record<string, ManifestRow> | undefined,
) {
	const items: Record<string, DimIndexItem> = {};

	for (const [hash, row] of Object.entries(table ?? {})) {
		if (!row.n) continue;

		const { fragmentSlots, statMods } = readSubclassStats(row.st, statTable);
		items[hash] = {
			n: row.n,
			i: row.i,
			d: row.d,
			fs: fragmentSlots,
			sm: statMods.length > 0 ? statMods : undefined,
		};
	}

	return items;
}

function buildSubclasses(
	table: Record<string, CompactSubclassRow> | undefined,
) {
	const subclasses: Record<string, DimIndexSubclass> = {};
	const options: DimIndex["options"] = {};

	for (const [hash, row] of Object.entries(table ?? {})) {
		subclasses[hash] = { n: row.n, i: row.i, ct: row.ct, el: row.el };

		for (const [slotId, optionHashes] of Object.entries(row.sl)) {
			for (const optionHash of optionHashes) {
				options[String(optionHash)] = slotId as DimIndex["options"][string];
			}
		}
	}

	return { subclasses, options };
}

function buildGear(table: Record<string, CompactGearRow> | undefined) {
	const gear: Record<string, DimIndexGear> = {};

	for (const [hash, row] of Object.entries(table ?? {})) {
		gear[hash] = { n: row.n, i: row.i, t: row.t, tt: row.tt, sh: row.sh };
	}

	return gear;
}

function buildSets(table: Record<string, ManifestItemSetRow> | undefined) {
	const sets: Record<string, DimIndexSet> = {};

	for (const [hash, row] of Object.entries(table ?? {})) {
		if (!row.n || !row.sp) continue;
		sets[hash] = { n: row.n, sp: row.sp };
	}

	return sets;
}

async function main() {
	const sourcePath = path.join(process.cwd(), ...SOURCE_PATH);
	const outputPath = path.join(process.cwd(), ...OUTPUT_PATH);

	let snapshot: ManifestSnapshot;
	try {
		snapshot = JSON.parse(
			await readFile(sourcePath, "utf8"),
		) as ManifestSnapshot;
	} catch {
		// The build inspector then has nothing to look hashes up in and says so,
		// which is no reason to fail a build of every other page.
		console.warn(`No manifest snapshot at ${sourcePath}, skipping DIM index.`);
		return;
	}

	const tables = snapshot.tables;
	const { subclasses, options } = buildSubclasses(tables?.Subclasses);

	const index: DimIndex = {
		generatedAt: snapshot.generatedAt ?? new Date().toISOString(),
		items: buildItems(
			tables?.DestinyInventoryItemDefinition,
			tables?.DestinyStatDefinition,
		),
		subclasses,
		options,
		gear: buildGear(tables?.Gear),
		sets: buildSets(tables?.DestinyEquipableItemSetDefinition),
	};

	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, JSON.stringify(index), "utf8");
	console.log(
		`Wrote DIM index: ${outputPath} (${String(Object.keys(index.items).length)} items, ${String(Object.keys(index.gear).length)} gear)`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
