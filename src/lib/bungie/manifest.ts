import {
	type DestinyManifestComponentName,
	getDestinyManifest,
	getDestinyManifestSlice,
} from "bungie-api-ts/destiny2";

import { getBungieHttpClient } from "./client";

export const DEFAULT_MANIFEST_TABLES: DestinyManifestComponentName[] = [
	"DestinyInventoryItemDefinition",
	"DestinySandboxPerkDefinition",
	"DestinyTraitDefinition",
	"DestinyDamageTypeDefinition",
	"DestinyBreakerTypeDefinition",
	"DestinyEquipableItemSetDefinition",
	// Subclass items reference their ability/aspect/fragment option lists through
	// plug sets, and aspects/fragments carry stat modifiers by stat hash.
	"DestinyPlugSetDefinition",
	"DestinyStatDefinition",
];

export async function fetchDestinyManifestSummary() {
	const response = await getDestinyManifest(getBungieHttpClient());
	return response.Response;
}

export async function fetchDestinyManifestTables(
	tableNames: DestinyManifestComponentName[] = DEFAULT_MANIFEST_TABLES,
) {
	const manifest = await fetchDestinyManifestSummary();
	const response = await getDestinyManifestSlice(getBungieHttpClient(), {
		destinyManifest: manifest,
		tableNames,
		language: "en",
	});
	return {
		manifest,
		tables: response,
	};
}
