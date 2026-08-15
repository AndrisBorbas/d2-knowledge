import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ARMOR_SET_NAME_ALIASES } from "../src/lib/bungie/armor-set-aliases";
import {
	DEFAULT_MANIFEST_TABLES,
	fetchDestinyManifestTables,
} from "../src/lib/bungie/manifest";
import {
	ARTIFACT_TAB_NAME,
	stripReleaseLabel,
} from "../src/lib/compendium/artifacts";
import { loadSheetSource } from "../src/lib/sheet/source";

type FoundryRecord = {
	hash?: number;
	itemHash?: number;
};

type CompactDefinition = {
	n?: string;
	i?: string;
	d?: string;
};

type CompactItemSetPerk = {
	c: number;
	h: number;
};

type CompactItemSetDefinition = CompactDefinition & {
	sp?: CompactItemSetPerk[];
};

type CompactManifestTables = {
	DestinyInventoryItemDefinition: Record<string, CompactDefinition>;
	DestinySandboxPerkDefinition: Record<string, CompactDefinition>;
	DestinyTraitDefinition: Record<string, CompactDefinition>;
	DestinyDamageTypeDefinition: Record<string, CompactDefinition>;
	DestinyBreakerTypeDefinition: Record<string, CompactDefinition>;
	DestinyEquipableItemSetDefinition: Record<string, CompactItemSetDefinition>;
};

function normalizeLookupName(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}

function removeFromName(value: string, remove: string) {
	return value.replace(remove, "").trim();
}

function asRecord<T>(value: unknown) {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, T>;
}

async function collectFoundryManifestHashes() {
	const foundryPath = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"foundry.json",
	);
	const contents = await readFile(foundryPath, "utf8");
	const payload = JSON.parse(contents) as Record<string, FoundryRecord>;

	const perkHashes = new Set<number>();
	const itemHashes = new Set<number>();

	for (const record of Object.values(payload)) {
		if (typeof record.hash === "number") {
			perkHashes.add(record.hash);
		}
		if (typeof record.itemHash === "number") {
			itemHashes.add(record.itemHash);
		}
	}

	return {
		perkHashes,
		itemHashes,
	};
}

async function collectSheetLookupTitles() {
	try {
		const sheetSource = await loadSheetSource();
		const titleKeys = new Set<string>();

		for (const entry of sheetSource.entries) {
			const candidates = [entry.title];

			// Artifact names only ever appear as a section header ("Hunter's
			// Journal (Echoes)"), never as an entry title, so allowlist them
			// explicitly to keep their inventory item — and its icon — around.
			if (entry.tab === ARTIFACT_TAB_NAME && entry.section) {
				candidates.push(stripReleaseLabel(entry.section));
			}

			for (const candidate of candidates) {
				const key = normalizeLookupName(candidate);
				if (!key) continue;
				titleKeys.add(key);
			}
		}

		return titleKeys;
	} catch (error) {
		console.warn("Unable to collect sheet lookup titles:", error);
		return new Set<string>();
	}
}

async function collectArmorSetNames() {
	try {
		const sheetSource = await loadSheetSource();
		const setNames = new Set<string>();

		for (const entry of sheetSource.unifiedEntries) {
			if (entry.kind !== "armor_set_bonus" || !entry.secondaryName) continue;
			const key = normalizeLookupName(entry.secondaryName);
			if (!key) continue;
			const alias = ARMOR_SET_NAME_ALIASES[key];
			setNames.add(alias ? normalizeLookupName(alias) : key);
		}

		return setNames;
	} catch (error) {
		console.warn("Unable to collect armor set names:", error);
		return new Set<string>();
	}
}

function toCompactDefinition(value: unknown) {
	const row = asRecord<unknown>(value);
	if (!row) return null;

	const displayProperties = asRecord<unknown>(row.displayProperties);
	const name =
		typeof displayProperties?.name === "string"
			? displayProperties.name
			: undefined;
	const icon =
		typeof displayProperties?.icon === "string"
			? displayProperties.icon
			: undefined;
	const description =
		typeof displayProperties?.description === "string"
			? displayProperties.description.trim()
			: undefined;

	if (!name && !icon) return null;
	return {
		n: name,
		i: icon,
		d: description || undefined,
	} satisfies CompactDefinition;
}

function filterTableToHashesAndTitles(
	table: unknown,
	allowedHashes: Set<number>,
	titleKeys: Set<string>,
) {
	const source = asRecord<unknown>(table);
	if (!source) {
		return {} as Record<string, CompactDefinition>;
	}

	const allowedHashStrings = new Set<string>();
	for (const hash of allowedHashes) {
		allowedHashStrings.add(String(hash));
	}

	const entries: Array<[string, CompactDefinition]> = [];
	for (const [key, value] of Object.entries(source)) {
		const compact = toCompactDefinition(value);
		if (!compact) continue;

		const shouldKeepForHash = allowedHashStrings.has(key);
		const shouldKeepForTitle =
			titleKeys.size > 0 &&
			typeof compact.n === "string" &&
			titleKeys.has(normalizeLookupName(compact.n));

		if (!shouldKeepForHash && !shouldKeepForTitle) continue;
		entries.push([key, compact]);
	}

	return Object.fromEntries(entries);
}

type ItemSetPerkSource = {
	requiredSetCount?: number;
	sandboxPerkHash?: number;
};

function filterItemSetTableToNames(table: unknown, setNameKeys: Set<string>) {
	const source = asRecord<unknown>(table);
	if (!source) {
		return {
			compact: {} as Record<string, CompactItemSetDefinition>,
			perkHashes: new Set<number>(),
		};
	}

	const compact: Record<string, CompactItemSetDefinition> = {};
	const perkHashes = new Set<number>();

	for (const [key, value] of Object.entries(source)) {
		const row = asRecord<unknown>(value);
		if (!row) continue;

		const displayProperties = asRecord<unknown>(row.displayProperties);
		const name =
			typeof displayProperties?.name === "string"
				? displayProperties.name
				: undefined;
		if (
			!name ||
			(!setNameKeys.has(normalizeLookupName(name)) &&
				!setNameKeys.has(normalizeLookupName(removeFromName(name, "Set"))))
		) {
			continue;
		}

		const icon =
			typeof displayProperties?.icon === "string"
				? displayProperties.icon
				: undefined;

		const setPerksSource = Array.isArray(row.setPerks)
			? (row.setPerks as ItemSetPerkSource[])
			: [];
		const sp: CompactItemSetPerk[] = [];
		for (const perk of setPerksSource) {
			if (
				typeof perk.requiredSetCount !== "number" ||
				typeof perk.sandboxPerkHash !== "number"
			) {
				continue;
			}
			sp.push({ c: perk.requiredSetCount, h: perk.sandboxPerkHash });
			perkHashes.add(perk.sandboxPerkHash);
		}

		compact[key] = { n: name, i: icon, sp: sp.length > 0 ? sp : undefined };
	}

	return { compact, perkHashes };
}

// Damage/breaker type tables are small fixed enumerations we always look up
// by their enumValue (e.g. DamageType.Arc), not by hash, so key the compact
// table by enumValue instead.
function buildEnumKeyedTable(table: unknown) {
	const source = asRecord<unknown>(table);
	if (!source) {
		return {} as Record<string, CompactDefinition>;
	}

	const entries: Array<[string, CompactDefinition]> = [];
	for (const value of Object.values(source)) {
		const row = asRecord<unknown>(value);
		const enumValue = row?.enumValue;
		if (typeof enumValue !== "number") continue;

		const compact = toCompactDefinition(value);
		if (!compact) continue;

		entries.push([String(enumValue), compact]);
	}

	return Object.fromEntries(entries);
}

async function main() {
	const outputDir = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"compiled",
	);
	await mkdir(outputDir, { recursive: true });

	const { perkHashes, itemHashes } = await collectFoundryManifestHashes();
	const sheetTitleKeys = await collectSheetLookupTitles();
	const armorSetNameKeys = await collectArmorSetNames();
	const snapshot = await fetchDestinyManifestTables(DEFAULT_MANIFEST_TABLES);

	const itemSetResult = filterItemSetTableToNames(
		snapshot.tables.DestinyEquipableItemSetDefinition,
		armorSetNameKeys,
	);
	const allPerkHashes = new Set<number>([
		...perkHashes,
		...itemSetResult.perkHashes,
	]);

	const inventoryHashes = new Set<number>([...itemHashes, ...allPerkHashes]);
	const compactTables: CompactManifestTables = {
		DestinyInventoryItemDefinition: filterTableToHashesAndTitles(
			snapshot.tables.DestinyInventoryItemDefinition,
			inventoryHashes,
			sheetTitleKeys,
		),
		DestinySandboxPerkDefinition: filterTableToHashesAndTitles(
			snapshot.tables.DestinySandboxPerkDefinition,
			allPerkHashes,
			sheetTitleKeys,
		),
		DestinyTraitDefinition: filterTableToHashesAndTitles(
			snapshot.tables.DestinyTraitDefinition,
			allPerkHashes,
			sheetTitleKeys,
		),
		DestinyDamageTypeDefinition: buildEnumKeyedTable(
			snapshot.tables.DestinyDamageTypeDefinition,
		),
		DestinyBreakerTypeDefinition: buildEnumKeyedTable(
			snapshot.tables.DestinyBreakerTypeDefinition,
		),
		DestinyEquipableItemSetDefinition: itemSetResult.compact,
	};

	const outputPath = path.join(outputDir, "bungie-manifest.json");
	await writeFile(
		outputPath,
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				tableNames: DEFAULT_MANIFEST_TABLES,
				manifestVersion: snapshot.manifest.version,
				manifestPath: snapshot.manifest.mobileWorldContentPaths?.en ?? null,
				tables: compactTables,
			},
			null,
			"\t",
		),
		"utf8",
	);

	console.log(`Wrote Bungie manifest snapshot: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
