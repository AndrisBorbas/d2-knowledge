"use client";

import { useMemo, useState } from "react";

import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";

import { isMobileViewport } from "./helpers";

export function useClickedEntries(params: {
	keywordMap: Map<string, Keyword>;
	entryMap: Map<string, AnnotatedEntry>;
}) {
	const { keywordMap, entryMap } = params;
	const [clickedEntryIds, setClickedEntryIds] = useState<string[]>([]);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

	const clickedEntries = useMemo(
		() =>
			clickedEntryIds
				.map((entryId) => entryMap.get(entryId))
				.filter((entry): entry is AnnotatedEntry => Boolean(entry)),
		[clickedEntryIds, entryMap],
	);

	const handleKeywordClick = ({
		keywordId,
		entryId,
	}: {
		keywordId: string;
		entryId: string;
	}) => {
		const referencedEntryId = keywordMap
			.get(keywordId)
			?.references.find((candidateId) => entryMap.has(candidateId));
		const targetEntryId = referencedEntryId ?? entryId;

		setClickedEntryIds((currentIds) => [
			targetEntryId,
			...currentIds.filter((currentId) => currentId !== targetEntryId),
		]);

		if (isMobileViewport()) {
			setIsMobileDrawerOpen(true);
		}
	};

	const handleRemoveClickedEntry = (entryId: string) => {
		setClickedEntryIds((currentIds) =>
			currentIds.filter((currentId) => currentId !== entryId),
		);
	};

	const handleClearClickedEntries = () => {
		setClickedEntryIds([]);
	};

	return {
		clickedEntries,
		isMobileDrawerOpen,
		setIsMobileDrawerOpen,
		handleKeywordClick,
		handleRemoveClickedEntry,
		handleClearClickedEntries,
	};
}
