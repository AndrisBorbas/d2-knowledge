import { readFile } from "node:fs/promises";
import path from "node:path";

type BungieDisplayProperties = {
	name?: string;
	icon?: string;
};

type BungieInventoryDefinition = {
	displayProperties?: BungieDisplayProperties;
};

type BungieSandboxPerkDefinition = {
	displayProperties?: BungieDisplayProperties;
};

type BungieManifestSnapshot = {
	tables?: {
		DestinyInventoryItemDefinition?: Record<string, BungieInventoryDefinition>;
		DestinySandboxPerkDefinition?: Record<string, BungieSandboxPerkDefinition>;
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
	table: Record<
		string,
		BungieInventoryDefinition | BungieSandboxPerkDefinition
	> | null,
	hash: number | undefined,
) {
	if (!table || hash === undefined) return null;
	const row = table[String(hash)];
	if (!row) return null;
	return row.displayProperties ?? null;
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
};

class BungieSnapshotResolver implements BungieManifestSnapshotResolver {
	private readonly inventoryTable: Record<
		string,
		BungieInventoryDefinition
	> | null;
	private readonly perkTable: Record<
		string,
		BungieSandboxPerkDefinition
	> | null;

	constructor(snapshot: BungieManifestSnapshot) {
		this.inventoryTable = asRecord<BungieInventoryDefinition>(
			snapshot.tables?.DestinyInventoryItemDefinition,
		);
		this.perkTable = asRecord<BungieSandboxPerkDefinition>(
			snapshot.tables?.DestinySandboxPerkDefinition,
		);
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
		const perkDisplay = perkDisplayFromSandbox ?? perkDisplayFromInventory;

		return {
			itemName: itemDisplay?.name,
			itemIconPath: normalizeIconPath(itemDisplay?.icon),
			perkName: perkDisplay?.name,
			perkIconPath: normalizeIconPath(perkDisplay?.icon),
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
