"use client";

import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";

import { VirtualEntryGrid } from "./VirtualEntryGrid";

type EntryListPanelProps = {
	entries: AnnotatedEntry[];
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	hasActiveQuery: boolean;
	effectiveQuery: string;
	onClearSearch: () => void;
	onKeywordHover: (payload: {
		keywordId: string;
		entryId: string;
		anchorRect: DOMRect;
		entryRect: DOMRect;
	}) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: { keywordId: string; entryId: string }) => void;
	onGroupClick: (group: string) => void;
};

export function EntryListPanel({
	entries,
	entryMap,
	keywordMap,
	hasActiveQuery,
	effectiveQuery,
	onClearSearch,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
}: EntryListPanelProps) {
	if (entries.length === 0) {
		return (
			<div className="rounded-3xl border border-white/12 bg-black/45 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-md">
				<p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
					No matching entries
				</p>
				<p className="mt-3 text-sm text-white/72">
					No results found for{" "}
					<span className="font-semibold text-white">{effectiveQuery}</span>.
				</p>
				{hasActiveQuery ? (
					<button
						type="button"
						onClick={onClearSearch}
						className="mt-5 rounded-xl border border-white/16 bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/80 uppercase transition hover:bg-white/14"
					>
						Clear search
					</button>
				) : null}
			</div>
		);
	}

	return (
		<VirtualEntryGrid
			items={entries}
			entryMap={entryMap}
			keywordMap={keywordMap}
			onKeywordHover={onKeywordHover}
			onKeywordLeave={onKeywordLeave}
			onKeywordClick={onKeywordClick}
			onGroupClick={onGroupClick}
		/>
	);
}
