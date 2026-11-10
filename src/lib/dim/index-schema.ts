import type { SubclassSlotId } from "@/lib/bungie/subclass-schema";

// The hash lookup the build inspector reads, written by
// `scripts/build-dim-index.mts` from data/bungie-manifest.json and served as a
// static asset. A DIM build is nothing but item hashes, so this is the join
// between those hashes and the names, icons and in-game text the site has.

// Where the browser fetches it. Written into public/ by `bun run assets:prepare`.
export const DIM_INDEX_ASSET_URL = "/assets/data/dim-index.min.json";

// A plug, mod, perk, aspect, fragment or other item the manifest snapshot kept.
// A stat line the game prints under a fragment: "+10 Resilience".
export type DimIndexStatMod = {
	n: string;
	v: number;
};

export type DimIndexItem = {
	n: string;
	// Icon path, relative to the Bungie CDN.
	i?: string;
	// The in-game description, as Bungie wrote it (bracketed glyph tokens and all).
	d?: string;
	// Subclass aspects only: how many fragment slots the aspect grants.
	fs?: number;
	// Subclass fragments only: the stat lines it adds or takes.
	sm?: DimIndexStatMod[];
};

export type DimIndexSubclass = {
	n: string;
	i?: string;
	// DestinyClass: 0 Titan, 1 Hunter, 2 Warlock.
	ct: number;
	// The manifest's element token: arc, solar, void, stasis, strand, prism.
	el: string;
};

export type DimIndexGear = {
	n: string;
	i?: string;
	// "w" weapon, "a" armor.
	t: "w" | "a";
	// DestinyItemTierType: 5 legendary, 6 exotic.
	tt: number;
	// Armor only: the armor set the piece belongs to.
	sh?: number;
};

// An armor set and the perks its piece counts unlock.
export type DimIndexSet = {
	n: string;
	sp: { c: number; h: number }[];
};

export type DimIndex = {
	generatedAt: string;
	items: Record<string, DimIndexItem>;
	subclasses: Record<string, DimIndexSubclass>;
	// Which subclass slot an option hash belongs to. The same option hash can sit
	// in several subclasses, always in the same slot.
	options: Record<string, SubclassSlotId>;
	gear: Record<string, DimIndexGear>;
	sets: Record<string, DimIndexSet>;
};

const BUNGIE_CDN_BASE = "https://www.bungie.net";

export function toBungieUrl(path: string | undefined) {
	if (!path) return undefined;
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	return `${BUNGIE_CDN_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}
