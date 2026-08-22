import type { AlternateDescription, Entry } from "@/lib/compendium/model";
import { CLARITY_FALLBACK_TAB } from "@/lib/clarity/source";
import { isSameDescription } from "@/lib/utils/text";

import {
	toCanonicalTitleKey,
	type UnifiedEntry,
	type UnifiedSourceId,
} from "./unified";

export type SourcePriority = UnifiedSourceId[];

export const DEFAULT_SOURCE_PRIORITY: SourcePriority = [
	"clarity",
	"ddc",
	"bungie",
	"manual",
];

function getUnifiedMergeKey(entry: UnifiedEntry) {
	const titleKey = toCanonicalTitleKey(entry.title);

	if (entry.kind === "exotic_item_perk") {
		const itemKey = toCanonicalTitleKey(entry.secondaryName ?? "");
		return ["exotic", titleKey, itemKey || String(entry.itemHash ?? "")].join(
			"|",
		);
	}

	if (entry.kind === "armor_set_bonus") {
		const setKey = toCanonicalTitleKey(entry.secondaryName ?? "");
		return ["armor_set", setKey, titleKey].join("|");
	}

	// Artifacts reuse perk names across releases, and the reused perk often does
	// something different (see Dielectric on Encrypted Data Disk vs Tablet of
	// Ruin), so the artifact - the DDC section - is part of the identity.
	if (entry.kind === "artifact_perk") {
		const artifactKey = toCanonicalTitleKey(entry.section ?? "");
		return ["artifact", artifactKey, titleKey].join("|");
	}

	return [entry.kind ?? "general", titleKey].join("|");
}

function toAlternateDescription(
	entry: UnifiedEntry,
): AlternateDescription | null {
	if (entry.description.trim().length === 0) return null;

	return {
		sourceId: entry.sourceId,
		text: entry.description,
		descriptionSegments: entry.descriptionSegments,
		iconGlyphs: entry.iconGlyphs,
	};
}

// The merge keeps one description and would otherwise drop the other source's
// text entirely. Collect the losers instead, skipping anything that only
// restates text already on the card - the same DDC row shows up on several
// element tabs, so duplicates are the norm, not the exception.
function collectAlternates(
	winner: UnifiedEntry,
	loser: UnifiedEntry,
	// Enhanced Clarity text supersedes the base perk's rather than sitting
	// beside it, so that one case drops the loser's own body while still
	// keeping whatever alternates it had picked up from other sources.
	options: { keepLoserDescription?: boolean } = {},
): AlternateDescription[] | undefined {
	const collected: AlternateDescription[] = [];

	const candidates = [
		...(winner.alternateDescriptions ?? []),
		options.keepLoserDescription === false
			? null
			: toAlternateDescription(loser),
		...(loser.alternateDescriptions ?? []),
	];

	for (const candidate of candidates) {
		if (!candidate) continue;
		if (isSameDescription(candidate.text, winner.description)) continue;
		if (
			collected.some((existing) =>
				isSameDescription(existing.text, candidate.text),
			)
		) {
			continue;
		}
		collected.push(candidate);
	}

	return collected.length > 0 ? collected : undefined;
}

// Clarity ships the base perk and its enhanced version as two records with the
// same name (Iron Grip is both a "Weapon Trait" and a "Weapon Trait Enhanced").
// They merge into one entry, and showing both bodies just prints the perk twice
// with different numbers.
//
// The enhanced body is the one to keep: it restates the whole perk with the
// upgraded values and marks each change with 🡅. Keyed on the record type, not
// on that arrow - 20 "Weapon Frame Enhanced" records have no arrow at all, and
// 14 unrelated origin traits and catalysts use one.
//
// Reads sourceRefs[0] because a merged entry's own ref is always first: both
// branches of the merge below put the winner's refs ahead of the loser's.
function isEnhancedVariant(entry: UnifiedEntry) {
	const ownRef = entry.sourceRefs[0];
	if (ownRef?.sourceId !== "clarity") return false;
	return /enhanced/i.test(ownRef.type ?? "");
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
				candidate.tab === CLARITY_FALLBACK_TAB &&
				existing.tab !== CLARITY_FALLBACK_TAB;
			byKey.set(key, {
				...candidate,
				...(preserveExistingTab
					? {
							tab: existing.tab,
							section: existing.section,
							groups: existing.groups,
						}
					: {}),
				sourceRefs: [...candidate.sourceRefs, ...existing.sourceRefs],
				alternateDescriptions: collectAlternates(candidate, existing),
			});
			continue;
		}

		if (candidatePriority === existingPriority) {
			const candidateEnhanced = isEnhancedVariant(candidate);
			const existingEnhanced = isEnhancedVariant(existing);
			// Whichever of the two is the enhanced record wins outright, so the
			// pairing resolves the same way regardless of the order Clarity happens
			// to list the two records in.
			const swapForEnhanced = candidateEnhanced && !existingEnhanced;
			const winner = swapForEnhanced ? candidate : existing;
			const loser = swapForEnhanced ? existing : candidate;
			const isEnhancedPair = candidateEnhanced !== existingEnhanced;

			byKey.set(key, {
				...winner,
				sourceRefs: [...winner.sourceRefs, ...loser.sourceRefs],
				alternateDescriptions: collectAlternates(winner, loser, {
					keepLoserDescription: !isEnhancedPair,
				}),
			});
		}
	}

	return [...byKey.values()];
}

export function toEntries(unifiedEntries: UnifiedEntry[]): Entry[] {
	return unifiedEntries.map((entry) => ({ ...entry }));
}
