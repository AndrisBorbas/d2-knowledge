import { readFile } from "node:fs/promises";
import path from "node:path";

type BungieDisplayProperties = {
	name?: string;
	icon?: string;
};

type BungieManifestRow = {
	n?: string;
	i?: string;
	displayProperties?: BungieDisplayProperties;
};

type BungieManifestSnapshot = {
	tables?: {
		DestinyInventoryItemDefinition?: Record<string, BungieManifestRow>;
		DestinySandboxPerkDefinition?: Record<string, BungieManifestRow>;
		DestinyTraitDefinition?: Record<string, BungieManifestRow>;
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
	if (!name && !icon) return null;
	return {
		name,
		icon,
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
};

class BungieSnapshotResolver implements BungieManifestSnapshotResolver {
	private readonly inventoryTable: Record<string, BungieManifestRow> | null;
	private readonly perkTable: Record<string, BungieManifestRow> | null;
	private readonly traitTable: Record<string, BungieManifestRow> | null;
	private readonly displayByName: Map<string, BungieDisplayProperties>;
	private readonly itemDisplayByName: Map<string, BungieDisplayProperties>;

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
		this.displayByName = new Map<string, BungieDisplayProperties>();
		this.itemDisplayByName = new Map<string, BungieDisplayProperties>();

		this.addDisplayNames(this.traitTable, this.displayByName);
		this.addDisplayNames(this.perkTable, this.displayByName);
		this.addDisplayNames(this.inventoryTable, this.displayByName);
		this.addDisplayNames(this.inventoryTable, this.itemDisplayByName);
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
