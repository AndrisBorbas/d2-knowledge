// Some exotic-armor perks in the Clarity database (foundry.json) ship
// without an `itemHash` at all, so getExoticEnrichment() has nothing to look
// up the owning item by — the perk shows with no "Item: ..." attribution.
// This maps the perk's exact foundry `name` to the item it belongs to, used
// as a fallback only when the foundry record has no itemHash. Also read by
// scripts/fetch-bungie-manifest.mts, which needs the item title allowlisted
// so its icon/name make it into the compiled manifest snapshot at all.
export const EXOTIC_PERK_ITEM_NAME_ALIASES: Record<string, string> = {
	"Blood Magic": "Sanguine Alchemy", //2966741808
	"Tome of Dawn": "Wings of Sacred Dawn", //370930766
	"Close Enough": "Geomag Stabilizers", //121305948
	Insatiable: "Apotheosis Veil", //132452792
	"Sect of Force": "Aeon Safe", //796577360
	"Sect of Insight": "Aeon Soul", //859709617
	"Sect of Vigor": "Aeon Swift", //1096864740
};
