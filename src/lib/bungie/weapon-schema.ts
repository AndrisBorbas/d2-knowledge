// The wire format of the name-keyed weapon table in
// `data/bungie-manifest.json`, shared between the writer
// (`scripts/fetch-bungie-manifest.mts`) and the reader
// (`src/lib/bungie/snapshot.ts`).
//
// The Aegis sheets name weapons but cannot carry their icons: that column is an
// in-cell image, which no export includes. The manifest has the icons but the
// snapshot only keeps rows reachable by hash, and a weapon name matches several
// rows (normal, adept, vendor preview, dummy). So weapons get their own table,
// keyed by normalized name with one winning row each.
export type CompactWeaponRow = {
	// The manifest's own spelling of the name.
	n: string;
	// Icon path, relative to the Bungie CDN.
	i: string;
	// Season watermark, drawn over the icon corner in game.
	w?: string;
	// DestinyItemTierType: 5 legendary, 6 exotic.
	tt?: number;
	// DestinyDamageType: 1 kinetic, 2 arc, 3 solar, 4 void, 6 stasis, 7 strand.
	dt?: number;
	// DestinyAmmunitionType: 1 primary, 2 special, 3 heavy.
	at?: number;
};

export const WEAPON_ITEM_TYPE = 3;
// DestinyItemCategoryDefinition for "Dummies", the copies the manifest keeps
// for vendor previews and quest steps.
export const DUMMY_ITEM_CATEGORY_HASH = 3109687656;

export type WeaponTable = Record<string, CompactWeaponRow>;
