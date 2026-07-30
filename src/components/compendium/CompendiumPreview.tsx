"use client";

import { Group, Panel, Separator } from "react-resizable-panels";

import { CURATED_TOP_GROUPS } from "@/lib/compendium/groups";
import type { CompendiumDataset } from "@/lib/compendium/model";

import { ClickedTooltipsDrawer } from "./ClickedTooltipsDrawer";
import { ClickedTooltipsPanel } from "./ClickedTooltipsPanel";
import { EntryListPanel } from "./EntryListPanel";
import { FilterHeader } from "./FilterHeader";
import { HoverPreviewCard } from "./HoverPreviewCard";
import { StatsFooter } from "./StatsFooter";
import { useClickedEntries } from "./useClickedEntries";
import { useEntryFiltering } from "./useEntryFiltering";
import { useHoverPreview } from "./useHoverPreview";

type CompendiumPreviewProps = {
	dataset: CompendiumDataset;
};

export function CompendiumPreview({ dataset }: CompendiumPreviewProps) {
	const {
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
	} = useEntryFiltering(dataset);

	const {
		hoverPreview,
		hoverCardRef,
		resolvedHoverTop,
		hoverCardStyle,
		hoveredEntry,
		handleKeywordHover,
		handleKeywordLeave,
	} = useHoverPreview({ keywordMap, entryMap });

	const {
		clickedEntries,
		isMobileDrawerOpen,
		setIsMobileDrawerOpen,
		handleKeywordClick,
		handleRemoveClickedEntry,
		handleClearClickedEntries,
	} = useClickedEntries({ keywordMap, entryMap });

	return (
		<div className="relative flex min-h-screen w-full flex-col text-sm">
			<FilterHeader
				searchInput={searchInput}
				onSearchChange={handleSearchChange}
				hasActiveQuery={hasActiveQuery}
				onClearSearch={() => void handleClearSearch()}
				filterBarGroups={filterBarGroups}
				activeGroups={activeGroups}
				onToggleGroup={toggleGroup}
				clickedCount={clickedEntries.length}
				onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
			/>

			<main className="mr-4 min-h-[60vh]">
				<div className="h-[70vh] lg:hidden">
					<EntryListPanel
						entries={visibleEntries}
						entryMap={entryMap}
						keywordMap={keywordMap}
						hasActiveQuery={hasActiveQuery}
						effectiveQuery={effectiveQuery}
						onClearSearch={() => void handleClearSearch()}
						onKeywordHover={handleKeywordHover}
						onKeywordLeave={handleKeywordLeave}
						onKeywordClick={handleKeywordClick}
						onGroupClick={toggleGroup}
					/>
				</div>

				<Group
					orientation="horizontal"
					className="hidden max-h-[calc(100vh-2rem)] min-h-[60vh] lg:flex"
				>
					<Panel defaultSize="68%" minSize="40%">
						<div className="flex h-full flex-col">
							<div className="min-h-0 flex-1">
								<EntryListPanel
									entries={visibleEntries}
									entryMap={entryMap}
									keywordMap={keywordMap}
									hasActiveQuery={hasActiveQuery}
									effectiveQuery={effectiveQuery}
									onClearSearch={() => void handleClearSearch()}
									onKeywordHover={handleKeywordHover}
									onKeywordLeave={handleKeywordLeave}
									onKeywordClick={handleKeywordClick}
									onGroupClick={toggleGroup}
								/>
							</div>
						</div>
					</Panel>
					<Separator className="group mx-2 flex w-2 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/12">
						<div className="h-18 w-1 rounded-full bg-white/30 transition group-hover:bg-sky-200/80" />
					</Separator>
					<Panel defaultSize="32%" minSize="15%" maxSize="50%">
						<ClickedTooltipsPanel
							clickedEntries={clickedEntries}
							entryMap={entryMap}
							keywordMap={keywordMap}
							onKeywordHover={handleKeywordHover}
							onKeywordLeave={handleKeywordLeave}
							onKeywordClick={handleKeywordClick}
							onGroupClick={toggleGroup}
							onRemove={handleRemoveClickedEntry}
							onClearAll={handleClearClickedEntries}
						/>
					</Panel>
				</Group>
			</main>

			<HoverPreviewCard
				hoveredEntry={hoveredEntry}
				hoverPreview={hoverPreview}
				hoverCardStyle={hoverCardStyle}
				resolvedHoverTop={resolvedHoverTop}
				hoverCardRef={hoverCardRef}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={handleKeywordLeave}
				onKeywordClick={handleKeywordClick}
				onGroupClick={toggleGroup}
			/>

			<ClickedTooltipsDrawer
				isOpen={isMobileDrawerOpen}
				onClose={() => setIsMobileDrawerOpen(false)}
				clickedEntries={clickedEntries}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={handleKeywordLeave}
				onKeywordClick={handleKeywordClick}
				onGroupClick={toggleGroup}
				onRemove={handleRemoveClickedEntry}
			/>

			<StatsFooter
				activeGroupCount={activeGroups.length}
				curatedGroupCount={CURATED_TOP_GROUPS.length}
				visibleEntryCount={visibleEntries.length}
				totalEntryCount={allEntries.length}
				keywordCount={dataset.keywords.length}
				annotationCount={totalAnnotations}
				generatedAt={dataset.generatedAt}
			/>
		</div>
	);
}
