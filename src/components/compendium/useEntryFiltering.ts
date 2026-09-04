"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";

import { categorizeGroups, CURATED_TOP_GROUPS } from "@/lib/compendium/groups";
import type { CompendiumDataset } from "@/lib/compendium/model";
import { fuzzyFilterCompendiumEntries } from "@/lib/utils/fuzzy";

import { hashStringWithSeed } from "./helpers";

const SEARCH_DEBOUNCE_MS = 500;

export function useEntryFiltering(dataset: CompendiumDataset) {
	const [searchQuery, setSearchQuery] = useQueryState("q", {
		history: "push",
		limitUrlUpdates: { method: "throttle", timeMs: 200 },
	});
	const [searchInput, setSearchInput] = useState(() => searchQuery ?? "");
	const [priorSearchQuery, setPriorSearchQuery] = useState(searchQuery);
	const [activeGroups, setActiveGroups] = useQueryState(
		"g",
		parseAsArrayOf(parseAsString)
			.withDefault([])
			.withOptions({
				history: "push",
				limitUrlUpdates: { method: "throttle", timeMs: 200 },
			}),
	);
	const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
	// The ids the page was rendered with before the full dataset arrived. They
	// keep the top of the shuffled list so the order the reader is already
	// looking at does not rearrange under them mid-scroll.
	const [seedEntryIds] = useState(
		() => new Set(dataset.entries.map((entry) => entry.id)),
	);

	if (searchQuery !== priorSearchQuery) {
		setPriorSearchQuery(searchQuery);
		setSearchInput(searchQuery ?? "");
	}

	const toggleGroup = (group: string) => {
		void setActiveGroups((current) =>
			current.includes(group)
				? current.filter((existing) => existing !== group)
				: [...current, group],
		);
	};

	const clearGroups = () => {
		void setActiveGroups(null);
	};

	const filterBarGroups = useMemo(() => {
		const curated: string[] = [...CURATED_TOP_GROUPS];
		const extra = activeGroups.filter((group) => !curated.includes(group));
		return [...curated, ...extra];
	}, [activeGroups]);

	const effectiveQuery = searchQuery ?? "";
	const keywordMap = useMemo(
		() => new Map(dataset.keywords.map((keyword) => [keyword.id, keyword])),
		[dataset.keywords],
	);
	const allEntries = dataset.entries;
	const knownGroups = useMemo(
		() => new Set(allEntries.flatMap((entry) => entry.groups)),
		[allEntries],
	);
	const hasActiveQuery = effectiveQuery.trim().length > 0;
	const filteredEntries = useMemo(
		() => fuzzyFilterCompendiumEntries(allEntries, effectiveQuery),
		[allEntries, effectiveQuery],
	);
	const hasActiveGroups = activeGroups.length > 0;
	const visibleEntriesFiltered = useMemo(() => {
		if (!hasActiveGroups) {
			return filteredEntries;
		}

		return filteredEntries.filter((entry) =>
			activeGroups.every((group) => entry.groups.includes(group)),
		);
	}, [filteredEntries, hasActiveGroups, activeGroups]);
	// How many entries each group would leave once it joins the current
	// selection. Active groups report the current result count, inactive ones
	// preview the narrowed count, so a filter that leads nowhere reads as 0.
	const groupResultCounts = useMemo(() => {
		const counts = new Map<string, number>();

		for (const entry of visibleEntriesFiltered) {
			for (const group of entry.groups) {
				counts.set(group, (counts.get(group) ?? 0) + 1);
			}
		}

		return counts;
	}, [visibleEntriesFiltered]);
	const groupCategories = useMemo(
		() => categorizeGroups([...knownGroups].sort((a, b) => a.localeCompare(b))),
		[knownGroups],
	);
	const entryMap = useMemo(
		() => new Map(allEntries.map((entry) => [entry.id, entry])),
		[allEntries],
	);
	const shouldRandomize = !hasActiveQuery && !hasActiveGroups;
	const visibleEntries = useMemo(() => {
		if (!shouldRandomize) {
			return visibleEntriesFiltered;
		}

		return [...visibleEntriesFiltered].sort((left, right) => {
			// Seed entries first, so their positions survive the dataset swap. Within
			// each group the hash order is unchanged, which is what keeps the entries
			// already on screen exactly where they were.
			const leftIsSeed = seedEntryIds.has(left.id);
			if (leftIsSeed !== seedEntryIds.has(right.id)) {
				return leftIsSeed ? -1 : 1;
			}

			const leftScore = hashStringWithSeed(left.id, shuffleSeed);
			const rightScore = hashStringWithSeed(right.id, shuffleSeed);
			return leftScore - rightScore;
		});
	}, [visibleEntriesFiltered, shouldRandomize, shuffleSeed, seedEntryIds]);
	const totalAnnotations = allEntries.reduce(
		(count, entry) => count + entry.annotations.length,
		0,
	);

	useEffect(() => {
		if (activeGroups.length === 0) {
			return;
		}

		const prunedGroups = activeGroups.filter((group) => knownGroups.has(group));
		if (prunedGroups.length !== activeGroups.length) {
			void setActiveGroups(prunedGroups.length > 0 ? prunedGroups : null);
		}
	}, [activeGroups, knownGroups, setActiveGroups]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			const normalizedInput = searchInput.trim();
			const nextQuery = normalizedInput.length > 0 ? searchInput : null;

			if (nextQuery !== searchQuery) {
				void setSearchQuery(nextQuery);
			}
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [searchInput, searchQuery, setSearchQuery]);

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchInput(event.target.value);
	};

	const handleClearSearch = async () => {
		setSearchInput("");
		await setSearchQuery(null);
	};

	return {
		searchInput,
		handleSearchChange,
		handleClearSearch,
		hasActiveQuery,
		effectiveQuery,
		activeGroups,
		toggleGroup,
		clearGroups,
		filterBarGroups,
		groupCategories,
		groupResultCounts,
		keywordMap,
		entryMap,
		allEntries,
		visibleEntries,
		totalAnnotations,
	};
}
