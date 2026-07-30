import type { Entry, Keyword } from "@/lib/compendium/model";

export type KeywordColor =
	| "default"
	| "arc"
	| "solar"
	| "void"
	| "stasis"
	| "strand"
	| "prismatic"
	| "masterwork";

function getKeywordColorFromArray(types: string[]): KeywordColor | null {
	const lowerTypes = types.map((type) => type.toLowerCase());
	if (lowerTypes.includes("arc")) return "arc";
	if (lowerTypes.includes("solar")) return "solar";
	if (lowerTypes.includes("void")) return "void";
	if (lowerTypes.includes("stasis")) return "stasis";
	if (lowerTypes.includes("strand")) return "strand";
	if (lowerTypes.includes("prismatic")) return "prismatic";
	if (lowerTypes.includes("masterwork")) return "masterwork";
	return null;
}

function getKeywordColorFromString(string: string): KeywordColor | null {
	const lowerString = string.toLowerCase();
	if (lowerString.includes("arc")) return "arc";
	if (lowerString.includes("solar")) return "solar";
	if (lowerString.includes("void")) return "void";
	if (lowerString.includes("stasis")) return "stasis";
	if (lowerString.includes("strand")) return "strand";
	if (lowerString.includes("prismatic")) return "prismatic";
	if (lowerString.includes("masterwork")) return "masterwork";
	return null;
}

function getKeywordColorFromEntry(entry: Entry): KeywordColor | null {
	let color = getKeywordColorFromString(entry.tab);
	if (!color) {
		color = getKeywordColorFromString(entry.section ?? "");
	}
	return color;
}

export function getKeywordColor(
	keyword: Keyword,
	entry?: Entry,
): KeywordColor | null {
	let color = getKeywordColorFromArray(keyword.types);
	if (!color && entry) {
		color = getKeywordColorFromEntry(entry);
	}
	return color;
}

export function getClassFromColor(colors: KeywordColor): string {
	switch (colors) {
		case "arc":
			return "text-arc";
		case "solar":
			return "text-solar";
		case "void":
			return "text-void";
		case "stasis":
			return "text-stasis";
		case "strand":
			return "text-strand";
		case "prismatic":
			return "text-prismatic";
		case "masterwork":
			return "text-masterwork";
		default:
			return "text-foreground";
	}
}
