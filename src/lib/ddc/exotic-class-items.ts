// The Exotic Class Item each class equips these perks on. The sheet never
// names them - it files the perks by class instead ("Hunter-exclusive Perks")
// - so the item, and its icon, come from here.
export const EXOTIC_CLASS_TAB_NAME = "Exotic Class";

export const EXOTIC_CLASS_ITEM_BY_CLASS: Record<string, string> = {
	Hunter: "Relativism",
	Titan: "Stoicism",
	Warlock: "Solipsism",
};

export const EXOTIC_CLASS_ITEM_NAMES = Object.values(
	EXOTIC_CLASS_ITEM_BY_CLASS,
);
