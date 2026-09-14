import { ARCHETYPE_FRAME_ALIASES } from "@/lib/aegis/config";
import { normalizeLookupName } from "@/lib/utils/text";

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
	// DestinyBreakerType: 1 barrier, 2 overload, 3 unstoppable. Read off the
	// champion tag on the weapon's frame rather than out of its `breakerType`
	// field, which the manifest does not keep up to date. Set on all but one
	// weapon the sheets rate, since every frame counters a champion.
	bt?: number;
};

// Two different weapons can share a name: "High Albedo" is both a sidearm and
// a rocket sidearm, and the manifest has a row for each. Where the sheets rate
// both, the table carries an extra entry under this key so a row can ask for the
// one on its own frame; everything else is looked up by name alone.
//
// The sheets write "Lightweight" and "Rapid", the manifest "Lightweight Frame"
// and "Rapid-Fire Frame", so both spellings normalize to the same key.
export function weaponFrameKey(frame: string) {
	const named = ARCHETYPE_FRAME_ALIASES[frame.trim()] ?? frame;
	return normalizeLookupName(named.replace(/\s+frame$/i, ""));
}

export function weaponVariantKey(nameKey: string, frame: string) {
	const key = weaponFrameKey(frame);
	return key ? `${nameKey}::${key}` : nameKey;
}

export const WEAPON_ITEM_TYPE = 3;
// DestinyItemCategoryDefinition for "Dummies", the copies the manifest keeps
// for vendor previews and quest steps.
export const DUMMY_ITEM_CATEGORY_HASH = 3109687656;

export type WeaponTable = Record<string, CompactWeaponRow>;
