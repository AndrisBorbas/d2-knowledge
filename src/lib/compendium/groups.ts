export const CURATED_TOP_GROUPS = [
	// "Arc",
	// "Solar",
	// "Void",
	// "Stasis",
	// "Strand",
	// "Prismatic",
	// "Abilities",
	// "Weapon Perks",
	// "Armor Sets",
	// "Armor Perks",
	// "Artifact Perks",
] as const;

export type CuratedTopGroup = (typeof CURATED_TOP_GROUPS)[number];

type GroupCategory = {
	id: string;
	label: string;
	// Explicit members come first so the picker keeps a deliberate order inside
	// small categories. Anything else is claimed by `matches`.
	members?: readonly string[];
	matches?: (group: string) => boolean;
};

// Ordered: the first category that claims a group owns it, so the broad
// prefix rules further down never steal a curated name from above.
const GROUP_CATEGORIES: readonly GroupCategory[] = [
	{
		id: "element",
		label: "Element",
		members: ["Arc", "Solar", "Void", "Stasis", "Strand", "Prismatic"],
	},
	{
		id: "subclass",
		label: "Subclass",
		members: [
			"Abilities",
			"Super Abilities",
			"Grenade Abilities",
			"Melee Abilities",
			"Class Abilities",
			"Aspect",
			"Fragments",
			"Subclass Class",
		],
	},
	{
		id: "class",
		label: "Class",
		members: ["Hunter", "Titan", "Warlock"],
	},
	{
		id: "rarity",
		label: "Rarity",
		members: ["Exotic"],
	},
	{
		id: "weapons",
		label: "Weapons",
		members: [
			"Weapon Perks",
			"Weapon Traits",
			"Origin Traits",
			"Intrinsic Traits",
			"Regular Weapon Mods",
		],
		matches: (group) =>
			group.startsWith("Weapon") || group.endsWith("Information"),
	},
	{
		id: "armor",
		label: "Armor",
		members: [
			"Armor Perks",
			"Armor Sets",
			"Armor Mods",
			"Armor Mod General",
			"Helmet",
			"Arms",
			"Chest",
			"Legs",
			"Class Item",
		],
		matches: (group) => group.startsWith("Armor"),
	},
	{
		id: "artifact",
		label: "Artifact",
		members: ["Artifact Perks"],
		// Seasonal artifacts carry their season in parentheses, e.g.
		// "Tablet of Ruin (Heresy)". New ones land here without a code change.
		matches: (group) => /\(.+\)$/.test(group),
	},
	{
		id: "activities",
		label: "Activities",
		members: [
			"Vault of Glass",
			"Deep Stone Crypt",
			"Vow of the Disciple",
			"King's Fall",
			"Root of Nightmares",
			"Crota's End",
			"Salvation's Edge",
			"Last Wish",
			"Garden of Salvation",
			"Nightmare Hunts",
			"Dreaming City",
		],
	},
] as const;

const OTHER_CATEGORY_LABEL = "Other";

export type CategorizedGroups = {
	id: string;
	label: string;
	groups: string[];
};

/**
 * Buckets every group the dataset actually contains into the taxonomy above.
 * Unknown groups are never dropped - they fall through to "Other" so a data
 * change can add a filter without touching this file.
 */
export function categorizeGroups(
	groups: readonly string[],
): CategorizedGroups[] {
	const remaining = new Set(groups);
	const categorized: CategorizedGroups[] = [];

	for (const category of GROUP_CATEGORIES) {
		const claimed: string[] = [];

		for (const member of category.members ?? []) {
			if (remaining.delete(member)) {
				claimed.push(member);
			}
		}

		if (category.matches) {
			const matched = [...remaining]
				.filter((group) => category.matches?.(group))
				.sort((left, right) => left.localeCompare(right));

			for (const group of matched) {
				remaining.delete(group);
				claimed.push(group);
			}
		}

		if (claimed.length > 0) {
			categorized.push({
				id: category.id,
				label: category.label,
				groups: claimed,
			});
		}
	}

	if (remaining.size > 0) {
		categorized.push({
			id: "other",
			label: OTHER_CATEGORY_LABEL,
			groups: [...remaining].sort((left, right) => left.localeCompare(right)),
		});
	}

	return categorized;
}
