import type { TabNormalizationConfigMap } from "./normalize";

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

export const COMPENDIUM_ACTIVE_TAB_NAMES = COMPENDIUM_TAB_NAMES.filter(
	(tabName) => !tabName.startsWith(LEGACY_TAB_PREFIX) && tabName !== "Landing",
);

export const COMPENDIUM_TAB_NORMALIZATION: TabNormalizationConfigMap = {
	"Weapon Perks": {
		strategy: "same-row",
		titleColumn: 0,
		descriptionColumn: 2,
		section: {
			mode: "single-cell",
			column: 1,
			maxLength: 64,
			minLength: 2,
			forbidSentenceEnding: true,
		},
	},
	"Artifact Perks": {
		strategy: "paired-rows",
		titleColumns: [2, 5, 8],
		descriptionMatch: "by-order",
		descriptionRowOffset: 1,
		maxTitleLength: 80,
		minDescriptionLength: 16,
		section: {
			mode: "single-cell",
			maxLength: 120,
			minLength: 2,
			forbidSentenceEnding: true,
		},
	},
};
