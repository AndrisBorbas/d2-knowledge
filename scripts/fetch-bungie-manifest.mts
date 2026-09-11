import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { EXOTICS_TAB,WEAPON_TIER_TABS } from "../src/lib/aegis/config";
import { readAegisSheetSnapshot } from "../src/lib/aegis/snapshot";
import { cellFirstLine, readTable } from "../src/lib/aegis/table";
import { ARMOR_SET_NAME_ALIASES } from "../src/lib/bungie/armor-set-aliases";
import { EXOTIC_PERK_ITEM_NAME_ALIASES } from "../src/lib/bungie/exotic-perk-item-aliases";
import {
	DEFAULT_MANIFEST_TABLES,
	fetchDestinyManifestTables,
} from "../src/lib/bungie/manifest";
import {
	ARMOR_CHARGE_MOD_BOILERPLATE_PREFIXES,
	CATALYST_MASTERWORK_BOILERPLATE_PREFIXES,
} from "../src/lib/bungie/officialDescription";
import { PERK_TITLE_ALIASES } from "../src/lib/bungie/perk-title-aliases";
import {
	type CompactStatMod,
	type CompactSubclassRow,
	type SubclassSlotId,
	toElementToken,
	toSubclassSlotId,
} from "../src/lib/bungie/subclass-schema";
import {
	type CompactWeaponRow,
	DUMMY_ITEM_CATEGORY_HASH,
	WEAPON_ITEM_TYPE,
	type WeaponTable,
} from "../src/lib/bungie/weapon-schema";
import {
	ARTIFACT_TAB_NAME,
	stripReleaseLabel,
} from "../src/lib/compendium/artifacts";
import { EXOTIC_CLASS_ITEM_NAMES } from "../src/lib/ddc/exotic-class-items";
import { loadDdcSource } from "../src/lib/ddc/source";
import { normalizeLookupName } from "../src/lib/utils/text";

type ClarityRecord = {
	hash?: number;
	itemHash?: number;
};

type CompactDefinition = {
	n?: string;
	i?: string;
	d?: string;
	// Stat modifiers, kept only for subclass aspects (fragment slot capacity)
	// and fragments (the +/- stat lines the game prints under them).
	st?: CompactStatMod[];
	// Names of the perks an exotic catalyst grants (see
	// resolvePerkFallbackDisplay) - the catalyst item itself is only ever named
	// after its weapon, so this is the only place the granted perk's name
	// ("The Rock" on Forerunner Catalyst) survives the compaction.
	gp?: string[];
	// Inventory items only: the row is a seasonal artifact perk plug. Artifact
	// perks are looked up by name, and plenty of their names are also carried
	// by an emblem, an ornament or a sandbox perk with a different icon, so the
	// resolver needs to be able to search these rows alone.
	ap?: true;
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
	DestinyStatDefinition: Record<string, CompactDefinition>;
	Subclasses: Record<string, CompactSubclassRow>;
	Weapons: WeaponTable;
	DestinySandboxPerkDefinition: Record<string, CompactDefinition>;
	DestinyTraitDefinition: Record<string, CompactDefinition>;
	DestinyDamageTypeDefinition: Record<string, CompactDefinition>;
	DestinyBreakerTypeDefinition: Record<string, CompactDefinition>;
	DestinyEquipableItemSetDefinition: Record<string, CompactItemSetDefinition>;
};

function removeFromName(value: string, remove: string) {
	return value.replace(remove, "").trim();
}

function asRecord<T>(value: unknown) {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, T>;
}

async function collectClarityManifestHashes() {
	const clarityPath = path.join(process.cwd(), "data", "clarity.json");
	const contents = await readFile(clarityPath, "utf8");
	const payload = JSON.parse(contents) as Record<string, ClarityRecord>;

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

async function collectDdcLookupTitles() {
	try {
		const ddcSource = await loadDdcSource();
		const titleKeys = new Set<string>();

		for (const entry of ddcSource.entries) {
			const candidates = [entry.title];

			// Artifact names only ever appear as a section header ("Hunter's
			// Journal (Echoes)"), never as an entry title, so allowlist them
			// explicitly to keep their inventory item - and its icon - around.
			if (entry.tab === ARTIFACT_TAB_NAME && entry.section) {
				candidates.push(stripReleaseLabel(entry.section));
			}

			for (const candidate of candidates) {
				const key = normalizeLookupName(candidate);
				if (!key) continue;
				titleKeys.add(key);
				// The row the resolver will actually look up for an aliased
				// title, which is filed under the manifest's own spelling.
				const alias = PERK_TITLE_ALIASES[key];
				if (alias) titleKeys.add(normalizeLookupName(alias));
			}
		}

		// Perks whose clarity record has no itemHash (see
		// exotic-perk-item-aliases.ts) resolve their item by title instead, so
		// that item needs to survive the manifest filter too. The Exotic Class
		// Items are the same case: the sheet never names them, so no entry
		// title would keep them.
		for (const itemName of [
			...Object.values(EXOTIC_PERK_ITEM_NAME_ALIASES),
			...EXOTIC_CLASS_ITEM_NAMES,
		]) {
			const key = normalizeLookupName(itemName);
			if (!key) continue;
			titleKeys.add(key);
		}

		return titleKeys;
	} catch (error) {
		console.warn("Unable to collect DDC lookup titles:", error);
		return new Set<string>();
	}
}

async function collectArmorSetNames() {
	try {
		const ddcSource = await loadDdcSource();
		const setNames = new Set<string>();

		for (const entry of ddcSource.unifiedEntries) {
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

// The Aegis tier tabs name every rated weapon; the manifest is where their
// icons live. Read straight from the raw snapshot rather than the compiled
// weapons dataset, which is built after this script and would be a cycle.
async function collectAegisWeaponNames() {
	const snapshot = await readAegisSheetSnapshot("endgame");
	const nameKeys = new Set<string>();

	for (const layout of [...WEAPON_TIER_TABS, EXOTICS_TAB]) {
		const grid = snapshot.grid[layout.tab];
		if (!grid) {
			throw new Error(
				`The Aegis endgame snapshot has no "${layout.tab}" tab. Re-run the aegis snapshot script.`,
			);
		}
		for (const row of readTable(grid, layout).rows) {
			const key = normalizeLookupName(cellFirstLine(row.get("Name")));
			if (key) nameKeys.add(key);
		}
	}

	return nameKeys;
}

function asNumber(value: unknown) {
	return typeof value === "number" ? value : undefined;
}

// A weapon name matches several manifest rows: the current copy, sunset
// reissues, adept variants, vendor previews. Keep exactly one per name, biased
// towards the row a player would recognise.
function scoreWeaponRow(
	row: Record<string, unknown>,
	compact: CompactWeaponRow,
) {
	let score = compact.tt ?? 0;
	if (compact.w) score += 4;
	if (typeof row.screenshot === "string" && row.screenshot.length > 0) {
		score += 2;
	}
	return score;
}

function collectWeaponRows(table: unknown, wantedNameKeys: Set<string>) {
	const source = asRecord<unknown>(table);
	const rows: WeaponTable = {};
	if (!source) return rows;

	const scores = new Map<string, number>();

	for (const value of Object.values(source)) {
		const row = asRecord<unknown>(value);
		if (!row || row.redacted === true) continue;
		if (asNumber(row.itemType) !== WEAPON_ITEM_TYPE) continue;

		const categories = Array.isArray(row.itemCategoryHashes)
			? (row.itemCategoryHashes as number[])
			: [];
		if (categories.includes(DUMMY_ITEM_CATEGORY_HASH)) continue;

		const displayProperties = asRecord<unknown>(row.displayProperties);
		const name =
			typeof displayProperties?.name === "string"
				? displayProperties.name
				: undefined;
		const icon =
			typeof displayProperties?.icon === "string"
				? displayProperties.icon
				: undefined;
		if (!name || !icon) continue;

		const key = normalizeLookupName(name);
		if (!wantedNameKeys.has(key)) continue;

		const equippingBlock = asRecord<unknown>(row.equippingBlock);
		const watermark =
			typeof row.iconWatermark === "string" && row.iconWatermark.length > 0
				? row.iconWatermark
				: undefined;
		const compact: CompactWeaponRow = {
			n: name,
			i: icon,
			w: watermark,
			tt: asNumber(row.itemTierType),
			dt: asNumber(row.defaultDamageType),
			at: asNumber(equippingBlock?.ammoType),
		};

		const score = scoreWeaponRow(row, compact);
		if (rows[key] && (scores.get(key) ?? -1) >= score) continue;
		rows[key] = compact;
		scores.set(key, score);
	}

	return rows;
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

type PerkFallbackDisplay = {
	description: string;
	icon?: string;
	// Every granted perk that carries effect text, in the item's own order, so
	// the first one is the perk the description and icon above came from.
	names: string[];
};

// Many plug items - exotic catalysts, weapon mods (e.g. Icarus Grip) - carry
// no useful text of their own: catalysts show the generic "Upgrades this
// weapon to a Masterwork" boilerplate, and mods often have a flat-out empty
// displayProperties.description. In both cases the real effect text - and
// icon, for catalysts - lives on the first of the item's `perks`
// (DestinySandboxPerkDefinition entries) that has a non-empty description.
// See destinysets for the same lookup.
function resolvePerkFallbackDisplay(
	value: unknown,
	sandboxPerkTable: Record<string, unknown> | null,
): PerkFallbackDisplay | undefined {
	if (!sandboxPerkTable) return undefined;

	const row = asRecord<unknown>(value);
	const perks = Array.isArray(row?.perks)
		? (row.perks as Array<{ perkHash?: number }>)
		: [];

	let display: { description: string; icon?: string } | undefined;
	const names: string[] = [];

	for (const perk of perks) {
		if (typeof perk.perkHash !== "number") continue;
		const perkRow = asRecord<unknown>(sandboxPerkTable[String(perk.perkHash)]);
		const perkDisplay = asRecord<unknown>(perkRow?.displayProperties);
		const description =
			typeof perkDisplay?.description === "string"
				? perkDisplay.description.trim()
				: "";
		if (!description) continue;

		const icon =
			typeof perkDisplay?.icon === "string" ? perkDisplay.icon : undefined;
		display ??= { description, icon };

		const name =
			typeof perkDisplay?.name === "string" ? perkDisplay.name.trim() : "";
		if (name && !names.includes(name)) {
			names.push(name);
		}
	}

	if (!display) return undefined;
	return { ...display, names };
}

const ARTIFACT_PERK_PLUG_CATEGORY = "artifact_perks";

function isArtifactPerkItem(value: unknown) {
	const row = asRecord<unknown>(value);
	const plug = asRecord<unknown>(row?.plug);
	return plug?.plugCategoryIdentifier === ARTIFACT_PERK_PLUG_CATEGORY;
}

function toCompactItemDefinition(
	value: unknown,
	sandboxPerkTable: Record<string, unknown> | null,
) {
	const base = toCompactDefinition(value);
	if (!base) return null;

	const compact = isArtifactPerkItem(value)
		? { ...base, ap: true as const }
		: base;

	const isCatalystBoilerplate = CATALYST_MASTERWORK_BOILERPLATE_PREFIXES.some(
		(prefix) => compact.d?.startsWith(prefix),
	);
	const isArmorChargeModBoilerplate =
		ARMOR_CHARGE_MOD_BOILERPLATE_PREFIXES.some((prefix) =>
			compact.d?.startsWith(prefix),
		);
	const isMissingDescription = !compact.d;
	if (
		!isCatalystBoilerplate &&
		!isArmorChargeModBoilerplate &&
		!isMissingDescription
	)
		return compact;

	const perkDisplay = resolvePerkFallbackDisplay(value, sandboxPerkTable);
	if (!perkDisplay) return compact;

	return {
		...compact,
		d: perkDisplay.description,
		// The catalyst item's own icon is a generic masterwork box, so the
		// perk's icon (the actual effect) replaces it. Other plug items (e.g.
		// weapon mods) usually already show their own icon correctly - only
		// their description is missing - so leave that icon alone.
		i: isCatalystBoilerplate ? (perkDisplay.icon ?? compact.i) : compact.i,
		// Same reasoning for the name: a catalyst's own name is its weapon's,
		// where the granted perk carries the name the description and the
		// community actually use. Mods already name themselves properly.
		gp:
			isCatalystBoilerplate && perkDisplay.names.length > 0
				? perkDisplay.names
				: undefined,
	};
}

function filterTableToHashesAndTitles(
	table: unknown,
	allowedHashes: Set<number>,
	titleKeys: Set<string>,
	toCompact: (value: unknown) => CompactDefinition | null = toCompactDefinition,
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
		const compact = toCompact(value);
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

type SubclassCollection = {
	rows: Record<string, CompactSubclassRow>;
	// Every option item the 18 subclasses reference, so the inventory filter
	// keeps their name/icon/description rows.
	optionHashes: Set<number>;
	// Only the stats those options actually modify.
	statHashes: Set<number>;
	statModsByHash: Map<number, CompactStatMod[]>;
};

// DestinyItemType.Subclass.
const SUBCLASS_ITEM_TYPE = 16;

// The option list the game shows for a socket. Aspect and fragment sockets
// share one plug set across every copy of the socket, and Prismatic's
// Transcendence and Prismatic-grenade sockets have no plug set at all - they
// carry the single plug directly.
function resolveSocketPlugHashes(
	socket: Record<string, unknown>,
	plugSetTable: Record<string, unknown> | null,
) {
	const plugSetHash = socket.reusablePlugSetHash;
	if (typeof plugSetHash === "number" && plugSetTable) {
		const plugSet = asRecord<unknown>(plugSetTable[String(plugSetHash)]);
		const items = Array.isArray(plugSet?.reusablePlugItems)
			? (plugSet.reusablePlugItems as Array<{ plugItemHash?: number }>)
			: [];
		return items
			.map((item) => item.plugItemHash)
			.filter((hash): hash is number => typeof hash === "number");
	}

	const initial = socket.singleInitialItemHash;
	return typeof initial === "number" && initial !== 0 ? [initial] : [];
}

function collectStatMods(value: Record<string, unknown>) {
	const source = Array.isArray(value.investmentStats)
		? (value.investmentStats as Array<{
				statTypeHash?: number;
				value?: number;
			}>)
		: [];

	const stats: CompactStatMod[] = [];
	for (const stat of source) {
		if (typeof stat.statTypeHash !== "number") continue;
		if (typeof stat.value !== "number" || stat.value === 0) continue;
		stats.push({ h: stat.statTypeHash, v: stat.value });
	}
	return stats;
}

// The subclass items (one per class per element) are the only place the game's
// own slot structure exists: which supers a Prismatic Titan can pick, which
// fragments the element offers, which jump each class gets. None of that is in
// the DDC sheet or in Clarity.
function collectSubclasses(
	itemTable: unknown,
	plugSetTable: unknown,
): SubclassCollection {
	const items = asRecord<unknown>(itemTable);
	const plugSets = asRecord<unknown>(plugSetTable);
	const rows: Record<string, CompactSubclassRow> = {};
	const optionHashes = new Set<number>();
	const statHashes = new Set<number>();
	const statModsByHash = new Map<number, CompactStatMod[]>();
	// Plug categories a subclass socket offers that no slot claims - a loud
	// signal that Bungie renamed something (see SLOT_ID_ALIASES).
	const unknownSlots = new Set<string>();

	if (!items) {
		return { rows, optionHashes, statHashes, statModsByHash };
	}

	for (const [key, value] of Object.entries(items)) {
		const row = asRecord<unknown>(value);
		if (!row || row.itemType !== SUBCLASS_ITEM_TYPE) continue;

		const displayProperties = asRecord<unknown>(row.displayProperties);
		const name =
			typeof displayProperties?.name === "string"
				? displayProperties.name
				: undefined;
		const classType = row.classType;
		if (!name || typeof classType !== "number") continue;

		const sockets = asRecord<unknown>(row.sockets);
		const socketEntries = Array.isArray(sockets?.socketEntries)
			? (sockets.socketEntries as Array<Record<string, unknown>>)
			: [];

		const slots: Partial<Record<SubclassSlotId, number[]>> = {};
		let element: string | null = null;

		for (const socket of socketEntries) {
			for (const plugHash of resolveSocketPlugHashes(socket, plugSets)) {
				const plugRow = asRecord<unknown>(items[String(plugHash)]);
				if (!plugRow) continue;

				const plug = asRecord<unknown>(plugRow.plug);
				const identifier =
					typeof plug?.plugCategoryIdentifier === "string"
						? plug.plugCategoryIdentifier
						: undefined;

				const slotId = toSubclassSlotId(identifier);
				if (!slotId) {
					if (identifier) unknownSlots.add(identifier);
					continue;
				}

				const plugDisplay = asRecord<unknown>(plugRow.displayProperties);
				const plugName =
					typeof plugDisplay?.name === "string" ? plugDisplay.name : "";
				// "Empty Aspect Socket" / "Empty Fragment Socket" are the
				// placeholders the game draws in an unfilled slot.
				if (!plugName || plugName.startsWith("Empty ")) continue;

				element ??= toElementToken(identifier);

				const bucket = (slots[slotId] ??= []);
				if (!bucket.includes(plugHash)) {
					bucket.push(plugHash);
				}
				optionHashes.add(plugHash);

				if (slotId === "aspects" || slotId === "fragments") {
					const stats = collectStatMods(plugRow);
					if (stats.length > 0) {
						statModsByHash.set(plugHash, stats);
						for (const stat of stats) {
							statHashes.add(stat.h);
						}
					}
				}
			}
		}

		if (!element || Object.keys(slots).length === 0) continue;

		rows[key] = {
			n: name,
			i:
				typeof displayProperties?.icon === "string"
					? displayProperties.icon
					: undefined,
			sh: typeof row.screenshot === "string" ? row.screenshot : undefined,
			ct: classType,
			el: element,
			sl: slots,
		};
	}

	if (unknownSlots.size > 0) {
		console.warn(
			`Unmapped subclass plug categories: ${[...unknownSlots].join(", ")}`,
		);
	}

	return { rows, optionHashes, statHashes, statModsByHash };
}

function filterTableToHashes(table: unknown, allowedHashes: Set<number>) {
	const source = asRecord<unknown>(table);
	if (!source) {
		return {} as Record<string, CompactDefinition>;
	}

	const entries: Array<[string, CompactDefinition]> = [];
	for (const hash of allowedHashes) {
		const compact = toCompactDefinition(source[String(hash)]);
		if (!compact) continue;
		entries.push([String(hash), compact]);
	}

	return Object.fromEntries(entries);
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
	const outputDir = path.join(process.cwd(), "data");
	await mkdir(outputDir, { recursive: true });

	const { perkHashes, itemHashes } = await collectClarityManifestHashes();
	const ddcTitleKeys = await collectDdcLookupTitles();
	const armorSetNameKeys = await collectArmorSetNames();
	const aegisWeaponNameKeys = await collectAegisWeaponNames();
	const snapshot = await fetchDestinyManifestTables(DEFAULT_MANIFEST_TABLES);

	const itemSetResult = filterItemSetTableToNames(
		snapshot.tables.DestinyEquipableItemSetDefinition,
		armorSetNameKeys,
	);
	const allPerkHashes = new Set<number>([
		...perkHashes,
		...itemSetResult.perkHashes,
	]);

	const subclassResult = collectSubclasses(
		snapshot.tables.DestinyInventoryItemDefinition,
		snapshot.tables.DestinyPlugSetDefinition,
	);

	const inventoryHashes = new Set<number>([
		...itemHashes,
		...allPerkHashes,
		...subclassResult.optionHashes,
	]);
	const inventoryTable = filterTableToHashesAndTitles(
		snapshot.tables.DestinyInventoryItemDefinition,
		inventoryHashes,
		ddcTitleKeys,
		(value) =>
			toCompactItemDefinition(
				value,
				asRecord<unknown>(snapshot.tables.DestinySandboxPerkDefinition),
			),
	);

	// Stat mods are only meaningful on the subclass options, so they are stitched
	// on here rather than widening the compaction every item goes through.
	for (const [hash, stats] of subclassResult.statModsByHash) {
		const row = inventoryTable[String(hash)];
		if (row) row.st = stats;
	}

	const weaponRows = collectWeaponRows(
		snapshot.tables.DestinyInventoryItemDefinition,
		aegisWeaponNameKeys,
	);

	const compactTables: CompactManifestTables = {
		DestinyInventoryItemDefinition: inventoryTable,
		DestinySandboxPerkDefinition: filterTableToHashesAndTitles(
			snapshot.tables.DestinySandboxPerkDefinition,
			allPerkHashes,
			ddcTitleKeys,
		),
		DestinyTraitDefinition: filterTableToHashesAndTitles(
			snapshot.tables.DestinyTraitDefinition,
			allPerkHashes,
			ddcTitleKeys,
		),
		DestinyDamageTypeDefinition: buildEnumKeyedTable(
			snapshot.tables.DestinyDamageTypeDefinition,
		),
		DestinyBreakerTypeDefinition: buildEnumKeyedTable(
			snapshot.tables.DestinyBreakerTypeDefinition,
		),
		DestinyEquipableItemSetDefinition: itemSetResult.compact,
		DestinyStatDefinition: filterTableToHashes(
			snapshot.tables.DestinyStatDefinition,
			subclassResult.statHashes,
		),
		Subclasses: subclassResult.rows,
		Weapons: weaponRows,
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
	console.log(
		`Weapons: ${String(Object.keys(weaponRows).length)} of ${String(aegisWeaponNameKeys.size)} sheet names matched`,
	);
	console.log(
		`Subclasses: ${String(Object.keys(subclassResult.rows).length)}, options: ${String(subclassResult.optionHashes.size)}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
