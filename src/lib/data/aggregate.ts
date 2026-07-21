import type { Entry } from "@/lib/sheet/model";

import { FOUNDRY_FALLBACK_TAB } from "./sources/foundry";
import {
	toCanonicalTitleKey,
	type UnifiedEntry,
	type UnifiedSourceId,
} from "./unified/model";

export type SourcePriority = UnifiedSourceId[];

export const DEFAULT_SOURCE_PRIORITY: SourcePriority = [
	"foundry",
	"sheet",
	"bungie",
	"manual",
];

function getUnifiedMergeKey(entry: UnifiedEntry) {
	const titleKey = toCanonicalTitleKey(entry.title);
	const sectionKey = toCanonicalTitleKey(entry.section ?? "");

	if (entry.kind === "exotic_item_perk") {
		const itemKey = toCanonicalTitleKey(entry.secondaryName ?? "");
		return ["exotic", titleKey, itemKey || String(entry.itemHash ?? "")].join(
			"|",
		);
	}

	if (entry.kind === "armor_set_bonus") {
		return ["armor_set", titleKey, sectionKey].join("|");
	}

	return [entry.kind ?? "general", titleKey].join("|");
}

function combineArmorSetBonusDescriptions(
	existing: UnifiedEntry,
	candidate: UnifiedEntry,
) {
	if (
		existing.kind !== "armor_set_bonus" ||
		candidate.kind !== "armor_set_bonus"
	) {
		return existing;
	}

	const descriptions = [existing.description, candidate.description].filter(
		(description) => description.trim().length > 0,
	);
	if (descriptions.length < 2) {
		return existing;
	}

	const hasLabels = descriptions.some((description) =>
		/^\s*(2-piece|4-piece)\s*:/i.test(description),
	);
	if (hasLabels) {
		return existing;
	}

	const ordered = [existing, candidate].sort(
		(a, b) => a.source.row - b.source.row,
	);
	const mergedDescription = [
		`2-piece: ${ordered[0].description.trim()}`,
		`4-piece: ${ordered[1].description.trim()}`,
	].join("\n");

	return {
		...existing,
		description: mergedDescription,
	};
}

function getPriorityIndex(sourceId: UnifiedSourceId, priority: SourcePriority) {
	const index = priority.indexOf(sourceId);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function mergeUnifiedEntries(
	entries: UnifiedEntry[],
	priority: SourcePriority = DEFAULT_SOURCE_PRIORITY,
) {
	const byKey = new Map<string, UnifiedEntry>();

	for (const candidate of entries) {
		const key = getUnifiedMergeKey(candidate);
		if (!key) continue;

		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, candidate);
			continue;
		}

		const candidatePriority = getPriorityIndex(candidate.sourceId, priority);
		const existingPriority = getPriorityIndex(existing.sourceId, priority);
		if (candidatePriority < existingPriority) {
			const preserveExistingTab =
				candidate.tab === FOUNDRY_FALLBACK_TAB &&
				existing.tab !== FOUNDRY_FALLBACK_TAB;
			byKey.set(key, {
				...candidate,
				...(preserveExistingTab
					? { tab: existing.tab, section: existing.section }
					: {}),
				sourceRefs: [...candidate.sourceRefs, ...existing.sourceRefs],
			});
			continue;
		}

		if (candidatePriority === existingPriority) {
			const sourceRefs = [...existing.sourceRefs, ...candidate.sourceRefs];
			const mergedByKind = combineArmorSetBonusDescriptions(
				existing,
				candidate,
			);
			byKey.set(key, {
				...mergedByKind,
				sourceRefs,
			});
		}
	}

	return [...byKey.values()];
}

export function toEntries(unifiedEntries: UnifiedEntry[]): Entry[] {
	return unifiedEntries.map((entry) => ({ ...entry }));
}
