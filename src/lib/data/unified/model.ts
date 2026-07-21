import type { Entry } from "@/lib/sheet/model";

export type UnifiedSourceId = "sheet" | "foundry" | "bungie" | "manual";

export type UnifiedEntryKind =
	| "armor_set_bonus"
	| "weapon_perk_or_verb"
	| "ability"
	| "artifact_perk"
	| "exotic_item_perk"
	| "general";

export type UnifiedSourceRef = {
	sourceId: UnifiedSourceId;
	sourceKey: string;
	tab?: string;
	row?: number;
	column?: number;
	hash?: number;
	itemHash?: number;
	itemName?: string;
	type?: string;
	updatedAt?: number;
};

export type UnifiedEntry = Entry & {
	kind: UnifiedEntryKind;
	sourceId: UnifiedSourceId;
	sourceRefs: UnifiedSourceRef[];
	secondaryName?: string;
	iconPath?: string;
	secondaryIconPath?: string;
	itemHash?: number;
	perkHash?: number;
};

export function toCanonicalTitleKey(title: string) {
	return title
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ")
		.replace(/[^a-z0-9 ]+/g, "");
}

export function classifyUnifiedKind(params: {
	tab: string;
	section: string | null;
	sourceType?: string;
}) {
	const tabText = `${params.tab} ${params.section ?? ""}`.toLowerCase().trim();
	const sourceType = (params.sourceType ?? "").toLowerCase().trim();

	if (sourceType.includes("trait exotic") || tabText.includes("exotic")) {
		return "exotic_item_perk" as const;
	}

	if (
		sourceType.includes("armor trait") ||
		tabText.includes("armor perks") ||
		tabText.includes("set bonus")
	) {
		return "armor_set_bonus" as const;
	}

	if (sourceType.includes("artifact") || tabText.includes("artifact")) {
		return "artifact_perk" as const;
	}

	if (
		tabText.includes("abilit") ||
		tabText.includes("grenade") ||
		tabText.includes("melee") ||
		tabText.includes("aspect") ||
		tabText.includes("super")
	) {
		return "ability" as const;
	}

	if (
		sourceType.includes("weapon") ||
		sourceType.includes("trait") ||
		tabText.includes("perk") ||
		tabText.includes("trait") ||
		tabText.includes("verb")
	) {
		return "weapon_perk_or_verb" as const;
	}

	return "general" as const;
}
