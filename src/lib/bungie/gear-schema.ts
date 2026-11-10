import { WEAPON_ITEM_TYPE } from "./weapon-schema";

// Shape of the `Gear` table inside data/bungie-manifest.json, shared by the
// script that writes it (scripts/fetch-bungie-manifest.mts) and the build
// inspector's index that reads it (scripts/build-dim-index.mts).
//
// Nothing else on the site needs a weapon or armor piece by hash - the weapon
// tier list is name-keyed - but a DIM build names its gear by hash only, so this
// is the one place that hash -> name join lives.

// DestinyItemType 2. Weapons are WEAPON_ITEM_TYPE, defined next to the weapon
// table.
export const GEAR_ARMOR_ITEM_TYPE = 2;

// DestinyItemTierType (`inventory.tierType`): 5 legendary, 6 exotic.
export const GEAR_LEGENDARY_TIER = 5;
export const GEAR_EXOTIC_TIER = 6;

export type CompactGearRow = {
	// The manifest's own spelling of the name.
	n: string;
	// Icon path, relative to the Bungie CDN.
	i?: string;
	// "w" weapon, "a" armor.
	t: "w" | "a";
	// DestinyItemTierType: 5 legendary, 6 exotic.
	tt: number;
	// Armor only. DestinyClass: 0 Titan, 1 Hunter, 2 Warlock, 3 any.
	ct?: number;
};

export type GearTable = Record<string, CompactGearRow>;

// Weapons keep every legendary and exotic row, since adept, timelost and
// holofoil copies each have a hash of their own. Armor keeps exotics only: a
// legendary piece's name says little a build reader needs, and there are thousands
// of them.
export function shouldKeepGear(params: {
	itemType: number | undefined;
	tierType: number | undefined;
}) {
	const { itemType, tierType } = params;
	if (tierType === undefined) return false;

	if (itemType === WEAPON_ITEM_TYPE) {
		return tierType >= GEAR_LEGENDARY_TIER;
	}
	if (itemType === GEAR_ARMOR_ITEM_TYPE) {
		return tierType === GEAR_EXOTIC_TIER;
	}
	return false;
}
