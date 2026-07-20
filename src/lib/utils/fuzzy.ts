import Fuse from "fuse.js";

import type { AnnotatedEntry, AnnotatedTabData } from "@/lib/sheet/model";

const SEARCH_THRESHOLD = 0.38;

function scoreCompendiumEntries(
	tabs: AnnotatedTabData[],
	query: string,
): Map<string, number> {
	const indexedEntries = tabs.flatMap((tab) =>
		tab.entries.map((entry) => ({
			entry,
			title: entry.title,
			description: entry.description,
			secondaryName: entry.secondaryName ?? "",
			extraInfo: entry.extraInfo ?? "",
			itemHash: entry.itemHash != null ? String(entry.itemHash) : "",
			perkHash: entry.perkHash != null ? String(entry.perkHash) : "",
		})),
	);

	const fuse = new Fuse(indexedEntries, {
		includeScore: true,
		ignoreLocation: true,
		threshold: SEARCH_THRESHOLD,
		minMatchCharLength: 1,
		keys: [
			{ name: "title", weight: 0.58 },
			{ name: "description", weight: 0.22 },
			{ name: "secondaryName", weight: 0.08 },
			{ name: "extraInfo", weight: 0.04 },
			{ name: "itemHash", weight: 0.05 },
			{ name: "perkHash", weight: 0.03 },
		],
	});

	const scores = new Map<string, number>();

	for (const result of fuse.search(query)) {
		scores.set(result.item.entry.id, result.score ?? Number.MAX_SAFE_INTEGER);
	}

	return scores;
}

export function fuzzyFilterCompendiumTabs(
	tabs: AnnotatedTabData[],
	rawQuery: string,
): AnnotatedTabData[] {
	const query = rawQuery.trim();

	if (query.length === 0) {
		return tabs;
	}

	const scores = scoreCompendiumEntries(tabs, query);

	return tabs
		.map((tab) => {
			const entries = tab.entries
				.filter((entry) => scores.has(entry.id))
				.sort((left, right) => {
					const leftScore = scores.get(left.id) ?? Number.MAX_SAFE_INTEGER;
					const rightScore = scores.get(right.id) ?? Number.MAX_SAFE_INTEGER;

					return leftScore - rightScore;
				});

			return {
				name: tab.name,
				entries,
			};
		})
		.filter((tab) => tab.entries.length > 0);
}

/**
 * Ranks entries by match quality across all tabs. `fuzzyFilterCompendiumTabs`
 * only sorts within each tab, so entries from a later tab keep trailing
 * behind an earlier tab's weaker matches once flattened for display.
 */
export function fuzzySortCompendiumEntries(
	tabs: AnnotatedTabData[],
	rawQuery: string,
): AnnotatedEntry[] {
	const query = rawQuery.trim();
	const allEntries = tabs.flatMap((tab) => tab.entries);

	if (query.length === 0) {
		return allEntries;
	}

	const scores = scoreCompendiumEntries(tabs, query);

	return allEntries
		.filter((entry) => scores.has(entry.id))
		.sort((left, right) => {
			const leftScore = scores.get(left.id) ?? Number.MAX_SAFE_INTEGER;
			const rightScore = scores.get(right.id) ?? Number.MAX_SAFE_INTEGER;

			return leftScore - rightScore;
		});
}
