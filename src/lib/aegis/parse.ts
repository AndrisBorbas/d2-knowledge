import type {
	ArchetypeRow,
	BossRow,
	DamageShotRow,
	EnergyType,
	ExoticWeaponRow,
	LegendEntry,
	SustainedRow,
	TabStatus,
	TierRank,
	WeaponTierRow,
} from "@/lib/weapons/model";

import {
	ARCHETYPES_TAB,
	BOSSES_TAB,
	DAMAGE_TAB,
	ENERGY_TYPES,
	EXOTICS_TAB,
	PERKS_TAB,
	STATUS_TAB,
	SUSTAINED_TAB,
	type TabLayout,
	TIER_RANKS,
	type WeaponTierTab,
} from "./config";
import {
	assertHeaders,
	cellBoolean,
	cellFirstLine,
	cellInteger,
	cellLines,
	cellNumber,
	cellNumeric,
	cellOptional,
	cellSymbol,
	cellText,
	readTable,
	type SheetRow,
} from "./table";

function ref(layout: TabLayout, row: SheetRow) {
	return { tab: layout.tab, row: row.index, gid: layout.gid };
}

function toTier(value: string): TierRank | null {
	const text = cellText(value).toUpperCase();
	return (TIER_RANKS as readonly string[]).includes(text)
		? (text as TierRank)
		: null;
}

function toEnergy(value: string): EnergyType | null {
	const text = cellText(value);
	return (ENERGY_TYPES as readonly string[]).includes(text)
		? (text as EnergyType)
		: null;
}

// "Reckless Oracle / Pantheon version" is one weapon with a qualifier under it,
// not two weapons.
function splitName(value: string) {
	const lines = cellLines(value);
	return {
		name: lines[0] ?? "",
		nameNote: lines.length > 1 ? lines.slice(1).join(" ") : undefined,
	};
}

const ENHANCEABLE_HEADER = "⬆️";

const TIER_REQUIRED = [
	"Name",
	"Season",
	"Energy",
	"Source",
	ENHANCEABLE_HEADER,
	"Barrel",
	"Mag",
	"MW",
	"Perk 1",
	"Perk 2",
	"Origin Trait",
	"Notes",
	"#",
	"Tier",
];

export function parseTierTab(
	grid: string[][],
	layout: WeaponTierTab,
): WeaponTierRow[] {
	const table = readTable(grid, layout);
	assertHeaders(table, TIER_REQUIRED);

	const rows: WeaponTierRow[] = [];
	for (const row of table.rows) {
		const { name, nameNote } = splitName(row.get("Name"));
		if (!name) continue;

		rows.push({
			id: `tier:${layout.slug}:${row.index}`,
			tab: layout.tab,
			categorySlug: layout.slug,
			categoryLabel: layout.weaponType,
			rank: cellInteger(row.get("#")),
			tier: toTier(row.get("Tier")),
			name,
			nameNote,
			season: cellInteger(row.get("Season")),
			energy: toEnergy(row.get("Energy")),
			frame: cellOptional(row.get("Frame")),
			source: cellOptional(row.get("Source")),
			reserves: cellInteger(row.get("Ammo")),
			enhanceable: cellBoolean(row.get(ENHANCEABLE_HEADER)),
			barrels: cellLines(row.get("Barrel")),
			magazines: cellLines(row.get("Mag")),
			masterworks: cellLines(row.get("MW")),
			perks1: cellLines(row.get("Perk 1")),
			perks2: cellLines(row.get("Perk 2")),
			originTraits: cellLines(row.get("Origin Trait")),
			notes: cellOptional(row.get("Notes")),
			charge: table.has("Charge") ? cellNumber(row.get("Charge")) : undefined,
			impact: table.has("Impact") ? cellNumber(row.get("Impact")) : undefined,
			shield: table.has("Shield") ? cellNumber(row.get("Shield")) : undefined,
			ref: ref(layout, row),
		});
	}

	return rows;
}

export function parseExoticTab(grid: string[][]): ExoticWeaponRow[] {
	const table = readTable(grid, EXOTICS_TAB);
	assertHeaders(table, [
		"Name",
		"Season",
		"Ammo",
		"Type",
		"Tags",
		"Description",
		"Roam",
		"DPS",
		"Chall",
		"Speed",
		"Usage",
		"Tier",
	]);

	const rows: ExoticWeaponRow[] = [];
	for (const row of table.rows) {
		const name = cellFirstLine(row.get("Name"));
		if (!name) continue;

		rows.push({
			id: `exotic:${row.index}`,
			rank: cellInteger(row.get("#")),
			tier: toTier(row.get("Tier")),
			name,
			season: cellInteger(row.get("Season")),
			reserves: cellInteger(row.get("Ammo")),
			slot: cellOptional(row.get("Type")),
			tags: cellLines(row.get("Tags")),
			description: cellOptional(row.get("Description")),
			roam: cellSymbol(row.get("Roam")),
			dps: cellSymbol(row.get("DPS")),
			challenge: cellSymbol(row.get("Chall")),
			speed: cellSymbol(row.get("Speed")),
			usage: cellOptional(row.get("Usage")),
			ref: ref(EXOTICS_TAB, row),
		});
	}

	return rows;
}

// How a rated weapon finds its frame's damage math. Deliberately not an id:
// the sheet carries two "Hand cannon / Dynamic" rows, one special ammo and one
// primary, so this key is allowed to match more than one archetype.
export function archetypeMatchKey(weapon: string, frame: string) {
	return `${weapon}::${frame}`.toLowerCase();
}

// Everything on the Archetypes tab that is not one of these is a number the
// sheet computed. The banner row splits those into measured values and derived
// calculations; keeping each as a record means a new column lands in the table
// instead of failing the build.
const ARCHETYPE_TEXT_COLUMNS = new Set([
	"Icon",
	"Weapon",
	"Frame",
	"Stun",
	"Ammo",
	"Notes",
	"Tier",
]);

export function parseArchetypeTab(grid: string[][]): ArchetypeRow[] {
	const table = readTable(grid, ARCHETYPES_TAB);
	assertHeaders(table, ["Weapon", "Frame", "Ammo", "Notes", "Tier"]);

	const banner = grid[ARCHETYPES_TAB.bannerRow ?? 0] ?? [];
	let currentBanner = "";
	const bannerByHeader = new Map<string, string>();
	table.headers.forEach((header, index) => {
		const value = (banner[index] ?? "").trim();
		if (value) currentBanner = value;
		if (header) bannerByHeader.set(header, currentBanner);
	});

	const numericHeaders = table.headers.filter(
		(header) => header && !ARCHETYPE_TEXT_COLUMNS.has(header),
	);

	const rows: ArchetypeRow[] = [];
	for (const row of table.rows) {
		const weapon = cellText(row.get("Weapon"));
		const frameLines = cellLines(row.get("Frame"));
		const frame = frameLines[0] ?? "";
		if (!weapon || !frame) continue;

		const values: ArchetypeRow["values"] = {};
		const calculations: ArchetypeRow["calculations"] = {};
		for (const header of numericHeaders) {
			const cell = cellNumeric(row.get(header));
			if (cell.raw.length === 0) continue;
			if (bannerByHeader.get(header) === "CALCULATIONS") {
				calculations[header] = cell;
			} else {
				values[header] = cell;
			}
		}

		rows.push({
			id: `archetype:${String(row.index)}`,
			matchKey: archetypeMatchKey(weapon, frame),
			weapon,
			frame,
			frameNote:
				frameLines.length > 1 ? frameLines.slice(1).join(" ") : undefined,
			ammoSlot: cellOptional(row.get("Ammo")),
			tier: toTier(row.get("Tier")),
			notes: cellOptional(row.get("Notes")),
			values,
			calculations,
			ref: ref(ARCHETYPES_TAB, row),
		});
	}

	return rows;
}

export function parseDamageTab(grid: string[][]): DamageShotRow[] {
	const table = readTable(grid, DAMAGE_TAB);
	// `Type`, `Boss`, `#` and `Full Modifiers` each appear twice on this tab,
	// so the reader qualifies every occurrence with its banner group.
	assertHeaders(table, [
		"INFORMATION / Type",
		"Subtype",
		"crit Shot",
		"body Shot",
		"visual Value",
		"healthbar Value",
		"Patch",
	]);

	const rows: DamageShotRow[] = [];
	for (const row of table.rows) {
		const weaponType = cellText(row.get("INFORMATION / Type"));
		const subtype = cellText(row.get("Subtype"));
		if (!weaponType || !subtype) continue;

		rows.push({
			id: `damage:${row.index}`,
			weaponType,
			subtype,
			critShot: cellNumeric(row.get("crit Shot")),
			bodyShot: cellNumeric(row.get("body Shot")),
			otherTicks: cellOptional(row.get("other Ticks")),
			modifiers: cellOptional(row.get("Modifiers")),
			visualValue: cellNumeric(row.get("visual Value")),
			healthbarValue: cellNumeric(row.get("healthbar Value")),
			critRatio: cellNumeric(row.get("Crit")),
			patch: cellOptional(row.get("Patch")),
			ref: ref(DAMAGE_TAB, row),
		});
	}

	return rows;
}

export function parseSustainedTab(grid: string[][]): SustainedRow[] {
	const table = readTable(grid, SUSTAINED_TAB);
	assertHeaders(table, ["Name", "Type", "Family", "Total", "DPS"]);

	const rows: SustainedRow[] = [];
	for (const row of table.rows) {
		const lines = cellLines(row.get("Name"));
		const name = lines[0] ?? "";
		if (!name) continue;

		rows.push({
			id: `sustained:${row.index}`,
			name,
			loadout: lines.length > 1 ? lines.slice(1).join(" ") : undefined,
			slot: cellOptional(row.get("Type")),
			family: cellOptional(row.get("Family")),
			notes: cellOptional(row.get("Notes")),
			distribution: cellOptional(row.get("Distribution")),
			peakRate: cellNumeric(row.get("peak Rate")),
			timeToEmpty: cellNumeric(row.get("TtE")),
			base: cellNumeric(row.get("Base")),
			perk: cellNumeric(row.get("Perk")),
			surge: cellNumeric(row.get("Surge")),
			buff: cellNumeric(row.get("Buff")),
			debuff: cellNumeric(row.get("Debuff")),
			total: cellNumeric(row.get("Total")),
			dps: cellNumeric(row.get("DPS")),
			ref: ref(SUSTAINED_TAB, row),
		});
	}

	return rows;
}

export function parseBossTab(grid: string[][]): BossRow[] {
	const table = readTable(grid, BOSSES_TAB);
	assertHeaders(table, [
		"Activity",
		"Boss",
		"ingame Health",
		"effective Health",
	]);

	const rows: BossRow[] = [];
	for (const row of table.rows) {
		const boss = cellText(row.get("Boss"));
		if (!boss) continue;

		rows.push({
			id: `boss:${row.index}`,
			rank: cellInteger(row.get("#")),
			activity: cellText(row.get("Activity")),
			boss,
			ingameHealth: cellNumeric(row.get("ingame Health")),
			effectiveHealth: cellNumeric(row.get("effective Health")),
			species: cellOptional(row.get("Species")),
			mechanics: cellOptional(row.get("Mechanics")),
			setup: cellOptional(row.get("Setup")),
			adds: cellOptional(row.get("Adds")),
			range: cellOptional(row.get("Range")),
			phase: cellOptional(row.get("Phase")),
			clearableDps: cellNumeric(row.get("clearable DPS")),
			onePhaseDps: cellNumeric(row.get("1 phase DPS")),
			onePhaseDescription: cellOptional(row.get("1 phase Description")),
			mods: cellLines(row.get("Mods")),
			notes: cellOptional(row.get("Notes")),
			ref: ref(BOSSES_TAB, row),
		});
	}

	return rows;
}

export function parseStatusTab(grid: string[][]): TabStatus[] {
	const table = readTable(grid, STATUS_TAB);
	assertHeaders(table, ["TAB", "UPDATED", "STATUS"]);

	const rows: TabStatus[] = [];
	for (const row of table.rows) {
		const tab = cellText(row.get("TAB"));
		const updated = cellText(row.get("UPDATED"));
		// The closing notes sit in the TAB column alone and name no tab.
		if (!tab || !updated) continue;

		rows.push({
			tab,
			updated,
			status: cellOptional(row.get("STATUS")),
			news: cellOptional(row.get("NEWS")),
		});
	}

	return rows;
}

// Both legends are printed in a trailing pair of KEY columns that carry no
// header of their own, so they are read by position. Taking the sheet's own
// wording beats inventing ours.
function parseLegendColumns(
	grid: string[][],
	layout: TabLayout,
	symbolColumn: number,
	meaningColumn: number,
): LegendEntry[] {
	const entries: LegendEntry[] = [];
	const seen = new Set<string>();

	for (let index = layout.dataStartRow; index < grid.length; index++) {
		const symbol = cellText(grid[index]?.[symbolColumn] ?? "");
		const meaning = cellText(grid[index]?.[meaningColumn] ?? "");
		if (!symbol || !meaning || seen.has(symbol)) continue;
		seen.add(symbol);
		entries.push({ symbol, meaning });
	}

	return entries;
}

// The Perks tab is the only place the sheet spells out what S through F mean.
export function parseTierLegend(grid: string[][]): LegendEntry[] {
	return parseLegendColumns(grid, PERKS_TAB, 11, 12).filter((entry) =>
		(TIER_RANKS as readonly string[]).includes(entry.symbol),
	);
}

export function parseSymbolLegend(grid: string[][]): LegendEntry[] {
	return parseLegendColumns(grid, EXOTICS_TAB, 15, 16);
}
