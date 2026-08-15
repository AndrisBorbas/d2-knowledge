import { readFile } from "node:fs/promises";
import path from "node:path";

import { ARMOR_SET_NAME_ALIASES } from "./armor-set-aliases";
import { BREAKER_TYPE_ENUM_BY_GLYPH, DAMAGE_TYPE_ENUM_BY_GLYPH } from "./glyphs";

type BungieDisplayProperties = {
	name?: string;
	icon?: string;
	description?: string;
};

type BungieManifestRow = {
	n?: string;
	i?: string;
	d?: string;
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
	};
};

const BUNGIE_CDN_BASE = "https://www.bungie.net";

function normalizeLookupName(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}

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
};

export type BungieManifestSnapshotResolver = {
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

		return {
			itemName: itemDisplay?.name,
			itemIconPath: normalizeIconPath(itemDisplay?.icon),
			perkName: perkDisplay?.name,
			perkIconPath: normalizeIconPath(perkDisplay?.icon),
		};
	}

	getPerkEnrichmentByTitle(title: string) {
		const key = normalizeLookupName(title);
		if (!key) return null;
		const display = this.displayByName.get(key);
		if (!display) return null;

		return {
			perkName: display.name,
			perkIconPath: normalizeIconPath(display.icon),
		};
	}

	getItemEnrichmentByTitle(title: string) {
		const key = normalizeLookupName(title);
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

		const key = params.title ? normalizeLookupName(params.title) : "";
		if (!key) return undefined;
		return this.descriptionByName.get(key);
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
	const filePath = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"compiled",
		"bungie-manifest.json",
	);

	try {
		const contents = await readFile(filePath, "utf8");
		const snapshot = JSON.parse(contents) as BungieManifestSnapshot;
		return new BungieSnapshotResolver(snapshot);
	} catch {
		return null;
	}
}
