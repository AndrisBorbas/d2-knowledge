import Fuse from "fuse.js";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { AnnotatedEntry, AnnotatedTabData } from "@/lib/sheet/model";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type IndexedEntry = {
	entry: AnnotatedEntry;
	title: string;
	description: string;
	secondaryName: string;
	extraInfo: string;
	itemHash: string;
	perkHash: string;
};

const SEARCH_THRESHOLD = 0.38;

export function fuzzyFilterCompendiumTabs(
	tabs: AnnotatedTabData[],
	rawQuery: string,
): AnnotatedTabData[] {
	const query = rawQuery.trim();

	if (query.length === 0) {
		return tabs;
	}

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

	const scoredEntries = new Map<
		string,
		{ entry: AnnotatedEntry; score: number }
	>();

	for (const result of fuse.search(query)) {
		const score = result.score ?? Number.MAX_SAFE_INTEGER;
		scoredEntries.set(result.item.entry.id, {
			entry: result.item.entry,
			score,
		});
	}

	return tabs
		.map((tab) => {
			const entries = tab.entries
				.filter((entry) => scoredEntries.has(entry.id))
				.sort((left, right) => {
					const leftScore =
						scoredEntries.get(left.id)?.score ?? Number.MAX_SAFE_INTEGER;
					const rightScore =
						scoredEntries.get(right.id)?.score ?? Number.MAX_SAFE_INTEGER;

					return leftScore - rightScore;
				});

			return {
				name: tab.name,
				entries,
			};
		})
		.filter((tab) => tab.entries.length > 0);
}
