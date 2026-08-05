"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";

import { CURATED_TOP_GROUPS } from "@/lib/compendium/groups";
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
			const leftScore = hashStringWithSeed(left.id, shuffleSeed);
			const rightScore = hashStringWithSeed(right.id, shuffleSeed);
			return leftScore - rightScore;
		});
	}, [visibleEntriesFiltered, shouldRandomize, shuffleSeed]);
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
		filterBarGroups,
		keywordMap,
		entryMap,
		allEntries,
		visibleEntries,
		totalAnnotations,
	};
}
