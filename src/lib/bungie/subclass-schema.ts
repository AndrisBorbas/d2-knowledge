// Shape of the subclass slice inside data/bungie-manifest.json, shared by the
// script that writes it (scripts/fetch-bungie-manifest.mts) and the resolver
// that reads it (src/lib/bungie/snapshot.ts).

// The last segment of a plug's `plugCategoryIdentifier`
// ("titan.prism.aspects"). Socket category hashes differ per element, so this
// string - not the socket layout - is what buckets an option into its slot.
export const SUBCLASS_SLOT_IDS = [
	"supers",
	"class_abilities",
	"movement",
	"melee",
	"grenades",
	"aspects",
	"fragments",
	// Prismatic only.
	"transcendence",
	"prism_grenade",
] as const;

export type SubclassSlotId = (typeof SUBCLASS_SLOT_IDS)[number];

const SLOT_ID_SET = new Set<string>(SUBCLASS_SLOT_IDS);

// Stasis shipped before the naming settled and still calls its aspects
// "totems" and its fragments "trinkets" ("titan.stasis.totems",
// "shared.stasis.trinkets"). Every other element uses the names above.
const SLOT_ID_ALIASES: Record<string, SubclassSlotId> = {
	totems: "aspects",
	trinkets: "fragments",
};

export function toSubclassSlotId(
	plugCategoryIdentifier: string | undefined,
): SubclassSlotId | null {
	if (!plugCategoryIdentifier) return null;
	const segments = plugCategoryIdentifier.split(".");
	const slot = segments[segments.length - 1];
	if (SLOT_ID_SET.has(slot)) return slot as SubclassSlotId;
	return SLOT_ID_ALIASES[slot] ?? null;
}

// The middle segment of the same identifier. `prism` is the manifest's own
// spelling of Prismatic.
export const ELEMENT_NAME_BY_TOKEN: Record<string, string> = {
	arc: "Arc",
	solar: "Solar",
	void: "Void",
	stasis: "Stasis",
	strand: "Strand",
	prism: "Prismatic",
};

export function toElementToken(plugCategoryIdentifier: string | undefined) {
	if (!plugCategoryIdentifier) return null;
	const token = plugCategoryIdentifier.split(".")[1];
	return token && token in ELEMENT_NAME_BY_TOKEN ? token : null;
}

// DestinyClass: 0 Titan, 1 Hunter, 2 Warlock.
export const CLASS_NAME_BY_TYPE: Record<number, string> = {
	0: "Titan",
	1: "Hunter",
	2: "Warlock",
};

export function toSlug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/['‘’]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// The two stats that are structure rather than a bonus: how many fragment
// slots an aspect grants, and how much of that budget a fragment spends.
export const ASPECT_ENERGY_CAPACITY_STAT = 2223994109;
export const FRAGMENT_COST_STAT = 119204074;

export type CompactStatMod = {
	// Stat hash, resolved through the compact DestinyStatDefinition table.
	h: number;
	v: number;
};

export type CompactSubclassRow = {
	// Name, icon, screenshot (the background art the game shows behind the
	// subclass screen), class type, element token.
	n: string;
	i?: string;
	sh?: string;
	ct: number;
	el: string;
	// Option item hashes per slot, in the order the plug set lists them. The
	// items themselves live in the DestinyInventoryItemDefinition table.
	sl: Partial<Record<SubclassSlotId, number[]>>;
};
