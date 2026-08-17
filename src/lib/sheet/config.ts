import type { TabNormalizationConfigMap } from "./normalize";
import type { Section } from "./types";

export const COMPENDIUM_SHEET_ID =
	"1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4";
export const COMPENDIUM_TAB_NAMES = [
	"Landing",
	"Weapon Perks",
	"Armor Perks",
	"Artifact Perks",
	"Armor Mods",
	"Arc",
	"Solar",
	"Void",
	"Stasis",
	"Strand",
	"Prismatic",
	"Exotic Class",
	"Class Abilities",
	"Exotic Weapons",
	"Exotic Armors",
	"Game Mechanics",
];

const LEGACY_TAB_PREFIX = "OLD ";

const EXCLUDED_TAB_NAMES = ["Landing", "Weapon Perks", "Exotic Weapons"];

export const COMPENDIUM_ACTIVE_TAB_NAMES = COMPENDIUM_TAB_NAMES.filter(
	(tabName) =>
		!tabName.startsWith(LEGACY_TAB_PREFIX) &&
		!EXCLUDED_TAB_NAMES.includes(tabName),
);

const elementSections: Section[] = [
	{ name: "Glossary" },
	{ name: "Fragments" },
	{ name: "Grenade Abilities" },
	{ name: "Class Abilities" },
	{ name: "Melee Abilities" },
	{ name: "Super Abilities" },
	{ name: "Aspect" },
];

export const COMPENDIUM_TAB_NORMALIZATION: TabNormalizationConfigMap = {
	"Weapon Perks": {
		strategy: "same-row",
		titleColumn: 0,
		skipStart: 4,
		descriptionColumn: 2,
	},
	"Armor Perks": {
		strategy: "set-bonus-two-rows",
		skipStart: 2,
		titleColumn: 0,
		bonusRowOffset: 1,
		descriptionColumns: [2, 3, 4, 5],
		minDescriptionLength: 12,
		maxTitleLength: 120,
	},
	"Artifact Perks": {
		strategy: "paired-columns",
		skipStart: 3,
		titleColumns: [2, 5, 8],
		maxTitleLength: 80,
		minDescriptionLength: 16,
		dynamicSection: {
			maxLength: 80,
			minLength: 2,
			forbidSentenceEnding: true,
		},
	},
	Arc: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Spark of",
		skipStart: 2,
		sections: elementSections,
	},
	Solar: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Ember of",
		skipStart: 2,
		sections: elementSections,
	},
	Void: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Echo of",
		skipStart: 2,
		sections: elementSections,
	},
	Stasis: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Whisper of",
		skipStart: 2,
		sections: elementSections,
	},
	Strand: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Thread of",
		skipStart: 2,
		sections: elementSections,
	},
	Prismatic: {
		strategy: "same-row",
		type: "element",
		fragmentTitlePrefix: "Facet of",
		skipStart: 2,
		sections: elementSections,
		// Prismatic has no "Grenade Abilities" header of its own — each
		// class's exclusive grenade follows its class-name row directly.
		sectionAfterClassMarker: "Grenade Abilities",
		// Rejects the flat rows listing each class's *shared* grenades/melees
		// by name only (e.g. "Arcbolt Grenade" | "Swarm Grenade" | ...) —
		// those aren't title+description pairs, they're borrowed from other
		// subclasses' own tabs.
		minDescriptionLength: 20,
	},
};
