// Manual aliases for perks whose DDC title diverges from the name Bungie's
// manifest ships under. The Exotic Class Item perks are named after the
// exotic armor they borrow from, and DDC keeps that armor's article where the
// game drops it ("Spirit of the Inmost Light" for "Spirit of Inmost Light").
// Keys must already be normalizeLookupName()-shaped (lowercase, single
// spaces).
// Ability rows carry a second line - the aspect that changes them, or a note
// like "OLDEST" - which normalizeLookupName folds into the title, so they need
// an alias back to the ability the manifest actually ships. Handheld Supernova
// is the odd one out: the game dropped the name, and the only text left for it
// lives on the Chaos Accelerant aspect's sandbox perk.
export const PERK_TITLE_ALIASES: Record<string, string> = {
	"spirit of the inmost light": "Spirit of Inmost Light",
	"spirit of the synthoceps": "Spirit of Synthoceps",
	"silence squall": "Silence and Squall",
	slicewire: "Slicewire Grenade",
	"hammer of sol sol invictus aspect": "Hammer of Sol",
	"ward of dawn oldest": "Ward of Dawn",
	"handheld supernova chaos accelerant": "Chaos Accelerant",
};
