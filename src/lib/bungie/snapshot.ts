import { readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeLookupName } from "@/lib/utils/text";

import { ARMOR_SET_NAME_ALIASES } from "./armor-set-aliases";
import {
	BREAKER_TYPE_ENUM_BY_GLYPH,
	DAMAGE_TYPE_ENUM_BY_GLYPH,
} from "./glyphs";
import { PERK_TITLE_ALIASES } from "./perk-title-aliases";
import {
	ASPECT_ENERGY_CAPACITY_STAT,
	CLASS_NAME_BY_TYPE,
	type CompactStatMod,
	type CompactSubclassRow,
	ELEMENT_NAME_BY_TOKEN,
	FRAGMENT_COST_STAT,
	SUBCLASS_SLOT_IDS,
	type SubclassSlotId,
	toSlug,
} from "./subclass-schema";

type BungieDisplayProperties = {
	name?: string;
	icon?: string;
	description?: string;
};

type BungieManifestRow = {
	n?: string;
	i?: string;
	d?: string;
	// Only exotic catalysts carry this: the names of the perks the catalyst
	// grants, written by scripts/fetch-bungie-manifest.mts from the same perk
	// lookup that supplies the catalyst's description and icon.
	gp?: string[];
	// Only subclass aspects and fragments carry this.
	st?: CompactStatMod[];
	displayProperties?: BungieDisplayProperties;
};

type BungieItemSetPerkRow = {
	c: number;
	h: number;
};

type BungieItemSetRow = BungieManifestRow & {
	sp?: BungieItemSetPerkRow[];
};

type BungieManifestSnapshot = {
	tables?: {
		DestinyInventoryItemDefinition?: Record<string, BungieManifestRow>;
		DestinySandboxPerkDefinition?: Record<string, BungieManifestRow>;
		DestinyTraitDefinition?: Record<string, BungieManifestRow>;
		DestinyDamageTypeDefinition?: Record<string, BungieManifestRow>;
		DestinyBreakerTypeDefinition?: Record<string, BungieManifestRow>;
		DestinyEquipableItemSetDefinition?: Record<string, BungieItemSetRow>;
		DestinyStatDefinition?: Record<string, BungieManifestRow>;
		Subclasses?: Record<string, CompactSubclassRow>;
	};
};

const BUNGIE_CDN_BASE = "https://www.bungie.net";

function asRecord<T>(value: unknown) {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, T>;
}

function normalizeIconPath(value: string | undefined) {
	if (!value) return undefined;
	if (value.startsWith("http://") || value.startsWith("https://")) {
		return value;
	}
	if (value.startsWith("/")) {
		return `${BUNGIE_CDN_BASE}${value}`;
	}
	return `${BUNGIE_CDN_BASE}/${value}`;
}

function getDisplayProperties(
	table: Record<string, BungieManifestRow> | null,
	hash: number | undefined,
) {
	if (!table || hash === undefined) return null;
	const row = table[String(hash)];
	if (!row) return null;
	const name = row.n ?? row.displayProperties?.name;
	const icon = row.i ?? row.displayProperties?.icon;
	const description = row.d ?? row.displayProperties?.description;
	if (!name && !icon) return null;
	return {
		name,
		icon,
		description,
	} satisfies BungieDisplayProperties;
}

export type BungieExoticEnrichment = {
	itemName?: string;
	itemIconPath?: string;
	perkName?: string;
	perkIconPath?: string;
	// Catalysts only - see BungieManifestRow.gp.
	grantedPerkNames?: string[];
};

export type BungieStatMod = {
	name: string;
	value: number;
};

export type BungieSubclassOption = {
	hash: number;
	name: string;
	iconPath?: string;
	description?: string;
	// Aspects only: how many fragment slots the aspect grants.
	fragmentSlots?: number;
	// Fragments only: how much of that budget this fragment spends.
	cost?: number;
	// The +/- stat lines the game prints under a fragment.
	statMods?: BungieStatMod[];
};

export type BungieSubclassSlot = {
	id: SubclassSlotId;
	options: BungieSubclassOption[];
};

export type BungieSubclass = {
	hash: number;
	// "Gunslinger", "Prismatic Titan" - the game's own name for the subclass.
	name: string;
	className: string;
	classSlug: string;
	element: string;
	elementSlug: string;
	iconPath?: string;
	screenshotPath?: string;
	slots: BungieSubclassSlot[];
};

export type BungieManifestSnapshotResolver = {
	getSubclasses(): BungieSubclass[];
	getStatName(statHash: number): string | undefined;
	getExoticEnrichment(params: {
		itemHash?: number;
		perkHash?: number;
	}): BungieExoticEnrichment;
	getPerkEnrichmentByTitle(title: string): {
		perkName?: string;
		perkIconPath?: string;
	} | null;
	getItemEnrichmentByTitle(title: string): {
		itemName?: string;
		itemIconPath?: string;
	} | null;
	getArmorSetBonusPerkEnrichment(params: {
		setName: string;
		requiredSetCount: number;
	}): {
		perkName?: string;
		perkIconPath?: string;
	} | null;
	getArmorSetIconPath(setName: string): string | undefined;
	getGlyphIconPath(className: string): string | undefined;
	getOfficialDescription(params: {
		perkHash?: number;
		itemHash?: number;
		title?: string;
	}): string | undefined;
};

class BungieSnapshotResolver implements BungieManifestSnapshotResolver {
	private readonly inventoryTable: Record<string, BungieManifestRow> | null;
	private readonly perkTable: Record<string, BungieManifestRow> | null;
	private readonly traitTable: Record<string, BungieManifestRow> | null;
	private readonly damageTypeTable: Record<string, BungieManifestRow> | null;
	private readonly breakerTypeTable: Record<string, BungieManifestRow> | null;
	private readonly itemSetTable: Record<string, BungieItemSetRow> | null;
	private readonly statTable: Record<string, BungieManifestRow> | null;
	private readonly subclassTable: Record<string, CompactSubclassRow> | null;
	private readonly displayByName: Map<string, BungieDisplayProperties>;
	private readonly itemDisplayByName: Map<string, BungieDisplayProperties>;
	private readonly itemSetByName: Map<string, BungieItemSetRow>;
	private readonly descriptionByName: Map<string, string>;

	constructor(snapshot: BungieManifestSnapshot) {
		this.inventoryTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinyInventoryItemDefinition,
		);
		this.perkTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinySandboxPerkDefinition,
		);
		this.traitTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinyTraitDefinition,
		);
		this.damageTypeTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinyDamageTypeDefinition,
		);
		this.breakerTypeTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinyBreakerTypeDefinition,
		);
		this.itemSetTable = asRecord<BungieItemSetRow>(
			snapshot.tables?.DestinyEquipableItemSetDefinition,
		);
		this.statTable = asRecord<BungieManifestRow>(
			snapshot.tables?.DestinyStatDefinition,
		);
		this.subclassTable = asRecord<CompactSubclassRow>(
			snapshot.tables?.Subclasses,
		);
		this.displayByName = new Map<string, BungieDisplayProperties>();
		this.itemDisplayByName = new Map<string, BungieDisplayProperties>();
		this.itemSetByName = new Map<string, BungieItemSetRow>();
		this.descriptionByName = new Map<string, string>();

		this.addDisplayNames(this.traitTable, this.displayByName);
		this.addDisplayNames(this.perkTable, this.displayByName);
		this.addDisplayNames(this.inventoryTable, this.displayByName);
		this.addDisplayNames(this.inventoryTable, this.itemDisplayByName);

		// Separate walk from addDisplayNames: that one only keeps rows that have
		// *both* a name and an icon, and plenty of perk rows carry description
		// text without an icon.
		this.addDescriptionNames(this.traitTable);
		this.addDescriptionNames(this.perkTable);
		this.addDescriptionNames(this.inventoryTable);

		if (this.itemSetTable) {
			for (const row of Object.values(this.itemSetTable)) {
				const name = row.n ?? row.displayProperties?.name;
				if (!name) continue;
				const key = normalizeLookupName(name);
				if (!key || this.itemSetByName.has(key)) continue;
				this.itemSetByName.set(key, row);
			}
		}
	}

	private resolveTitleKey(title: string) {
		const key = normalizeLookupName(title);
		const alias = PERK_TITLE_ALIASES[key];
		return alias ? normalizeLookupName(alias) : key;
	}

	private resolveArmorSetNameKey(setName: string) {
		const key = normalizeLookupName(setName);
		const alias = ARMOR_SET_NAME_ALIASES[key];
		return alias ? normalizeLookupName(alias) : key;
	}

	private addDisplayNames(
		table: Record<string, BungieManifestRow> | null,
		target: Map<string, BungieDisplayProperties>,
	) {
		if (!table) return;

		for (const row of Object.values(table)) {
			const name = row.n ?? row.displayProperties?.name;
			const icon = row.i ?? row.displayProperties?.icon;
			if (!name || !icon) continue;
			const key = normalizeLookupName(name);
			if (!key || target.has(key)) continue;
			target.set(key, { name, icon });
		}
	}

	private addDescriptionNames(table: Record<string, BungieManifestRow> | null) {
		if (!table) return;

		for (const row of Object.values(table)) {
			const name = row.n ?? row.displayProperties?.name;
			const description = (
				row.d ??
				row.displayProperties?.description ??
				""
			).trim();
			if (!name || !description) continue;
			const key = normalizeLookupName(name);
			if (!key || this.descriptionByName.has(key)) continue;
			this.descriptionByName.set(key, description);
		}
	}

	getExoticEnrichment(params: { itemHash?: number; perkHash?: number }) {
		const itemDisplay = getDisplayProperties(
			this.inventoryTable,
			params.itemHash,
		);
		const perkDisplayFromSandbox = getDisplayProperties(
			this.perkTable,
			params.perkHash,
		);
		const perkDisplayFromInventory = getDisplayProperties(
			this.inventoryTable,
			params.perkHash,
		);
		const perkDisplayFromTrait = getDisplayProperties(
			this.traitTable,
			params.perkHash,
		);
		const perkDisplay =
			perkDisplayFromInventory ??
			perkDisplayFromTrait ??
			perkDisplayFromSandbox;

		const grantedPerkNames =
			params.perkHash === undefined
				? undefined
				: this.inventoryTable?.[String(params.perkHash)]?.gp;

		return {
			itemName: itemDisplay?.name,
			itemIconPath: normalizeIconPath(itemDisplay?.icon),
			perkName: perkDisplay?.name,
			perkIconPath: normalizeIconPath(perkDisplay?.icon),
			grantedPerkNames,
		};
	}

	getPerkEnrichmentByTitle(title: string) {
		const key = this.resolveTitleKey(title);
		if (!key) return null;
		const display = this.displayByName.get(key);
		if (!display) return null;

		return {
			perkName: display.name,
			perkIconPath: normalizeIconPath(display.icon),
		};
	}

	getItemEnrichmentByTitle(title: string) {
		const key = this.resolveTitleKey(title);
		if (!key) return null;
		const display = this.itemDisplayByName.get(key);
		if (!display) return null;

		return {
			itemName: display.name,
			itemIconPath: normalizeIconPath(display.icon),
		};
	}

	getArmorSetBonusPerkEnrichment(params: {
		setName: string;
		requiredSetCount: number;
	}) {
		const key = this.resolveArmorSetNameKey(params.setName);
		if (!key) return null;
		const itemSet = this.itemSetByName.get(key);
		if (!itemSet?.sp) return null;

		const perkEntry = itemSet.sp.find((p) => p.c === params.requiredSetCount);
		if (!perkEntry) return null;

		const perkDisplay = getDisplayProperties(this.perkTable, perkEntry.h);
		if (!perkDisplay) return null;

		return {
			perkName: perkDisplay.name,
			perkIconPath: normalizeIconPath(perkDisplay.icon),
		};
	}

	getArmorSetIconPath(setName: string) {
		const key = this.resolveArmorSetNameKey(setName);
		if (!key) return undefined;
		return normalizeIconPath(this.itemSetByName.get(key)?.i);
	}

	getOfficialDescription(params: {
		perkHash?: number;
		itemHash?: number;
		title?: string;
	}) {
		// Same table precedence as getExoticEnrichment: the inventory item's own
		// copy of a perk is the string the game actually shows, the sandbox perk
		// row is the last resort.
		const byHash = [
			getDisplayProperties(this.inventoryTable, params.perkHash),
			getDisplayProperties(this.traitTable, params.perkHash),
			getDisplayProperties(this.perkTable, params.perkHash),
			getDisplayProperties(this.inventoryTable, params.itemHash),
		];

		for (const display of byHash) {
			const description = display?.description?.trim();
			if (description) return description;
		}

		const key = params.title ? this.resolveTitleKey(params.title) : "";
		if (!key) return undefined;
		return this.descriptionByName.get(key);
	}

	getStatName(statHash: number) {
		const row = this.statTable?.[String(statHash)];
		return row?.n ?? row?.displayProperties?.name;
	}

	// The in-game subclass screen, as data: one entry per class per element,
	// each holding the option list the game offers for every socket. Written by
	// scripts/fetch-bungie-manifest.mts; empty on a snapshot that predates it.
	getSubclasses(): BungieSubclass[] {
		if (!this.subclassTable) return [];

		const subclasses: BungieSubclass[] = [];

		for (const [hash, row] of Object.entries(this.subclassTable)) {
			const className = CLASS_NAME_BY_TYPE[row.ct];
			const element = ELEMENT_NAME_BY_TOKEN[row.el];
			if (!className || !element) continue;

			const slots: BungieSubclassSlot[] = [];
			// Iterating the canonical list rather than the row's own keys keeps
			// the slots in a fixed order regardless of socket layout.
			for (const slotId of SUBCLASS_SLOT_IDS) {
				const optionHashes = row.sl[slotId];
				if (!optionHashes || optionHashes.length === 0) continue;

				const options: BungieSubclassOption[] = [];
				for (const optionHash of optionHashes) {
					const option = this.inventoryTable?.[String(optionHash)];
					const name = option?.n ?? option?.displayProperties?.name;
					if (!option || !name) continue;

					const statMods: BungieStatMod[] = [];
					let fragmentSlots: number | undefined;
					let cost: number | undefined;
					for (const stat of option.st ?? []) {
						// Two of these describe the slot itself - the dots an aspect
						// adds and the budget a fragment spends - and are not stat
						// lines the game prints under the name.
						if (stat.h === ASPECT_ENERGY_CAPACITY_STAT) {
							fragmentSlots = stat.v;
							continue;
						}
						if (stat.h === FRAGMENT_COST_STAT) {
							cost = stat.v;
							continue;
						}
						const statName = this.getStatName(stat.h);
						if (!statName) continue;
						statMods.push({ name: statName, value: stat.v });
					}

					options.push({
						hash: optionHash,
						name,
						iconPath: normalizeIconPath(
							option.i ?? option.displayProperties?.icon,
						),
						description: (
							option.d ??
							option.displayProperties?.description ??
							""
						).trim(),
						fragmentSlots,
						cost,
						statMods: statMods.length > 0 ? statMods : undefined,
					});
				}

				if (options.length > 0) {
					slots.push({ id: slotId, options });
				}
			}

			subclasses.push({
				hash: Number(hash),
				name: row.n,
				className,
				classSlug: toSlug(className),
				element,
				elementSlug: toSlug(element),
				iconPath: normalizeIconPath(row.i),
				screenshotPath: normalizeIconPath(row.sh),
				slots,
			});
		}

		return subclasses;
	}

	getGlyphIconPath(className: string) {
		const key = className.toLowerCase();

		const damageEnum = DAMAGE_TYPE_ENUM_BY_GLYPH[key];
		if (damageEnum !== undefined) {
			return normalizeIconPath(this.damageTypeTable?.[String(damageEnum)]?.i);
		}

		const breakerEnum = BREAKER_TYPE_ENUM_BY_GLYPH[key];
		if (breakerEnum !== undefined) {
			return normalizeIconPath(this.breakerTypeTable?.[String(breakerEnum)]?.i);
		}

		return undefined;
	}
}

export async function loadBungieManifestSnapshotResolver() {
	// Build-time only, so it lives in data/ rather than public/ - nothing
	// serves it and it should not be deployed.
	const filePath = path.join(process.cwd(), "data", "bungie-manifest.json");

	try {
		const contents = await readFile(filePath, "utf8");
		const snapshot = JSON.parse(contents) as BungieManifestSnapshot;
		return new BungieSnapshotResolver(snapshot);
	} catch {
		return null;
	}
}
