// The Aeon sects sit at the foot of the Exotic Armors tab, and the sheet
// writes them like nothing else on it: any class can socket any sect, so they
// are laid across the three class columns for room rather than because a sect
// belongs to that class. Clarity files each sect against a single Aeon piece,
// which is the name the two records have to agree on to merge, and the sheet
// never writes it - so it comes from here.
export const EXOTIC_ARMORS_TAB_NAME = "Exotic Armors";

export const AEON_SECT_ITEM_BY_PERK: Record<string, string> = {
	"Sect of Force": "Aeon Safe",
	"Sect of Insight": "Aeon Soul",
	"Sect of Vigor": "Aeon Swift",
};

// The sheet shortens two pieces past the name the game gives them, and Clarity
// files their perks under the game's name - so the two records only meet once
// the shorthand is spelled back out.
export const EXOTIC_ARMOR_NAME_ALIASES: Record<string, string> = {
	"Loreley Splendor": "Loreley Splendor Helm",
	"Promethium Spurs": "Promethium Spur",
};
