import Fuse from "fuse.js";

import type { AnnotatedEntry } from "@/lib/sheet/model";

const SEARCH_THRESHOLD = 0.38;

function scoreCompendiumEntries(
	entries: AnnotatedEntry[],
	query: string,
): Map<string, number> {
	const indexedEntries = entries.map((entry) => ({
		entry,
		title: entry.title,
		description: entry.description,
		secondaryName: entry.secondaryName ?? "",
		extraInfo: entry.extraInfo ?? "",
		itemHash: entry.itemHash != null ? String(entry.itemHash) : "",
		perkHash: entry.perkHash != null ? String(entry.perkHash) : "",
	}));

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

export function fuzzyFilterCompendiumEntries(
	entries: AnnotatedEntry[],
	rawQuery: string,
): AnnotatedEntry[] {
	const query = rawQuery.trim();

	if (query.length === 0) {
		return entries;
	}

	const scores = scoreCompendiumEntries(entries, query);

	return entries
		.filter((entry) => scores.has(entry.id))
		.sort((left, right) => {
			const leftScore = scores.get(left.id) ?? Number.MAX_SAFE_INTEGER;
			const rightScore = scores.get(right.id) ?? Number.MAX_SAFE_INTEGER;

			return leftScore - rightScore;
		});
}
