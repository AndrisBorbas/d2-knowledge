"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { ClickedTooltipsDrawer } from "@/components/compendium/ClickedTooltipsDrawer";
import { ClickedTooltipsPanel } from "@/components/compendium/ClickedTooltipsPanel";
import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useClickedEntries } from "@/components/compendium/useClickedEntries";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { Button } from "@/components/ui/Button";
import { buildBundleMaps, type TooltipBundle } from "@/lib/compendium/bundle";
import type { Subclass } from "@/lib/compendium/subclasses";
import { cn } from "@/lib/utils/utils";

import { ELEMENT_TEXT_CLASS } from "./elementStyles";
import { SubclassBackdrop } from "./SubclassBackdrop";
import { SubclassSlotLayout } from "./SubclassSlotLayout";
import { SubclassSwitcher } from "./SubclassSwitcher";

type SubclassExplorerProps = {
	subclasses: Subclass[];
	selected: Subclass;
	bundle: TooltipBundle;
};

const PANEL_TITLE = "Pinned Abilities";
const PANEL_EMPTY_MESSAGE =
	"Click any ability, aspect or fragment to pin its tooltip here.";

export function SubclassExplorer({
	subclasses,
	selected,
	bundle,
}: SubclassExplorerProps) {
	const router = useRouter();

	// This page has no group filter of its own, so a group chip hands off to the
	// glossary's `?g=` filter.
	const handleGroupClick = (group: string) => {
		router.push(`/glossary?g=${encodeURIComponent(group)}`);
	};

	const { entryMap, keywordMap } = useMemo(
		() => buildBundleMaps(bundle),
		[bundle],
	);

	const {
		hoverPreview,
		hoverCardRef,
		resolvedHoverTop,
		hoverCardStyle,
		hoveredEntry,
		showEntryPreview,
		handleKeywordHover,
		handleKeywordLeave,
	} = useHoverPreview({ keywordMap, entryMap });

	const {
		clickedEntries,
		clickedEntryIds,
		isMobileDrawerOpen,
		setIsMobileDrawerOpen,
		handleKeywordClick,
		toggleClickedEntry,
		handleRemoveClickedEntry,
		handleClearClickedEntries,
	} = useClickedEntries({ keywordMap, entryMap });

	const layoutProps = {
		subclass: selected,
		pinnedIds: clickedEntryIds,
		onHover: showEntryPreview,
		onLeave: handleKeywordLeave,
		onToggle: toggleClickedEntry,
	};

	return (
		<div className="relative flex w-full flex-col text-sm">
			<SubclassBackdrop subclass={selected} />

			<div className="flex flex-col gap-4 p-4 md:px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						{selected.iconPath ? (
							<Image
								src={selected.iconPath}
								alt=""
								width={72}
								height={72}
								className="size-18 shrink-0 object-contain"
							/>
						) : null}
						<div>
							<h1
								className={cn(
									"text-3xl font-black uppercase text-shadow-[0px_0px_10px] lg:text-5xl",
									ELEMENT_TEXT_CLASS[selected.elementSlug] ?? "text-white",
								)}
							>
								{selected.element} {selected.className}
							</h1>
							<p className="text-base tracking-[0.2em] text-white/50 uppercase">
								{selected.name}
							</p>
						</div>
					</div>

					<Button
						variant="subtle"
						size="sm"
						className="lg:hidden"
						onClick={() => setIsMobileDrawerOpen(true)}
					>
						Pinned ({clickedEntries.length})
					</Button>
				</div>

				<SubclassSwitcher subclasses={subclasses} selected={selected} />
			</div>

			<main className="min-h-[60vh] px-4 pb-8 md:px-6 lg:px-8">
				<div className="@container lg:hidden">
					<SubclassSlotLayout {...layoutProps} />
				</div>

				<div className="hidden lg:flex">
					<Group orientation="horizontal" className="min-h-[60vh]">
						{/* The abilities are not scrollable: this panel is as tall as
						    its content, and it is what sets the row's height. */}
						<Panel defaultSize="68%" minSize="20%">
							<div className="@container px-2 pb-4">
								<SubclassSlotLayout {...layoutProps} />
							</div>
						</Panel>
						<Separator className="group mx-2 flex w-2 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/12">
							<div className="h-18 w-1 rounded-full bg-white/30 transition group-hover:bg-sky-200/80" />
						</Separator>
						{/* Absolutely positioned content contributes no height, so a
						    long pin list can never stretch the row - it stops where the
						    abilities stop and scrolls from there. `px-2` keeps the
						    scroll area from clipping the cards' hover frames. */}
						<Panel className="relative" defaultSize="32%" minSize="15%">
							<div className="absolute inset-0 overflow-y-auto px-2">
								<ClickedTooltipsPanel
									clickedEntries={clickedEntries}
									entryMap={entryMap}
									keywordMap={keywordMap}
									onKeywordHover={handleKeywordHover}
									onKeywordLeave={handleKeywordLeave}
									onKeywordClick={handleKeywordClick}
									onGroupClick={handleGroupClick}
									onRemove={handleRemoveClickedEntry}
									onClearAll={handleClearClickedEntries}
									title={PANEL_TITLE}
									emptyMessage={PANEL_EMPTY_MESSAGE}
								/>
							</div>
						</Panel>
					</Group>
				</div>
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
				onGroupClick={handleGroupClick}
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
				onGroupClick={handleGroupClick}
				onRemove={handleRemoveClickedEntry}
			/>
		</div>
	);
}
