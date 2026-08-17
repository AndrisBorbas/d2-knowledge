import Fuse from "fuse.js/min";

import type { AnnotatedEntry } from "@/lib/compendium/model";

const SEARCH_THRESHOLD = 0.28;

function scoreCompendiumEntries(
	entries: AnnotatedEntry[],
	query: string,
): Map<string, number> {
	const indexedEntries = entries.map((entry) => ({
		entry,
		title: entry.title,
		description: entry.description,
		originalDescription: entry.officialDescription ?? "",
		secondaryName: entry.secondaryName ?? "",
		secondaryDetail: entry.secondaryDetail ?? "",
		extraInfo: entry.extraInfo ?? "",
		itemHash: entry.itemHash != null ? String(entry.itemHash) : "",
		perkHash: entry.perkHash != null ? String(entry.perkHash) : "",
	}));

	const fuse = new Fuse(indexedEntries, {
		includeScore: true,
		ignoreLocation: true,
		threshold: SEARCH_THRESHOLD,
		minMatchCharLength: 2,
		useExtendedSearch: true,
		keys: [
			{ name: "title", weight: 0.58 },
			{ name: "secondaryName", weight: 0.56 },
			{ name: "description", weight: 0.54 },
			{ name: "originalDescription", weight: 0.53 },
			{ name: "secondaryDetail", weight: 0.52 },
			{ name: "extraInfo", weight: 0.5 },
			{ name: "itemHash", weight: 0.4 },
			{ name: "perkHash", weight: 0.4 },
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
		.sort(
			(left, right) =>
				(scores.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
				(scores.get(right.id) ?? Number.MAX_SAFE_INTEGER),
		);
}
