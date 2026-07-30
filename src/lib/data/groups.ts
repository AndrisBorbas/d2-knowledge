export const CURATED_TOP_GROUPS = [
	"Arc",
	"Solar",
	"Void",
	"Stasis",
	"Strand",
	"Prismatic",
	"Abilities",
	"Weapon Perks",
	"Armor Sets",
	"Armor Mods",
	"Artifact Perks",
] as const;

export type CuratedTopGroup = (typeof CURATED_TOP_GROUPS)[number];
