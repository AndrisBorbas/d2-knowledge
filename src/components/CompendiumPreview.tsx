"use client";

import { X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import type { CompendiumDataset } from "@/lib/sheet/model";
import {
	fuzzyFilterCompendiumTabs,
	fuzzySortCompendiumEntries,
} from "@/lib/utils/fuzzy";
import { cn } from "@/lib/utils/utils";

import { Tooltip } from "./Tooltip";
import { VirtualEntryGrid } from "./VirtualEntryGrid";

type CompendiumPreviewProps = {
	dataset: CompendiumDataset;
};

type TabFilter = "all" | string;

type HoverPreviewState = {
	entryId: string;
	placement: "top" | "bottom";
	anchor: {
		top: number;
		bottom: number;
		left: number;
		width: number;
	};
};

type VisibleEntryItem = {
	tabName: string;
	entry: CompendiumDataset["tabs"][number]["entries"][number];
};

const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";
const HOVER_CARD_WIDTH = 520;
const HOVER_CARD_MARGIN = 12;
const HOVER_CARD_OFFSET = 10;
const SEARCH_DEBOUNCE_MS = 500;

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function hashStringWithSeed(value: string, seed: number) {
	let hash = (seed ^ 0x9e3779b9) >>> 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = Math.imul(hash ^ value.charCodeAt(index), 2654435761) >>> 0;
		hash = ((hash << 13) | (hash >>> 19)) >>> 0;
	}

	return hash >>> 0;
}

function isMobileViewport() {
	if (typeof window === "undefined") {
		return false;
	}

	return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export function CompendiumPreview({ dataset }: CompendiumPreviewProps) {
	const [searchQuery, setSearchQuery] = useQueryState("q");
	const [searchInput, setSearchInput] = useState("");
	const [tabQuery, setTabQuery] = useQueryState("tab");
	const activeTab: TabFilter = tabQuery ?? "all";
	const setActiveTab = (nextTab: TabFilter) => {
		void setTabQuery(nextTab === "all" ? null : nextTab);
	};
	const [clickedEntryIds, setClickedEntryIds] = useState<string[]>([]);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
	const [hoverPreview, setHoverPreview] = useState<HoverPreviewState | null>(
		null,
	);
	const shuffleSeedRef = useRef(Math.floor(Math.random() * 0x7fffffff));
	const effectiveQuery = searchQuery ?? "";
	const keywordMap = useMemo(
		() => new Map(dataset.keywords.map((keyword) => [keyword.id, keyword])),
		[dataset.keywords],
	);
	const tabNames = useMemo(
		() => dataset.tabs.map((tab) => tab.name),
		[dataset.tabs],
	);
	const hasActiveQuery = effectiveQuery.trim().length > 0;
	const filteredTabs = useMemo(
		() => fuzzyFilterCompendiumTabs(dataset.tabs, effectiveQuery),
		[dataset.tabs, effectiveQuery],
	);
	const sortedEntries = useMemo(
		() => fuzzySortCompendiumEntries(dataset.tabs, effectiveQuery),
		[dataset.tabs, effectiveQuery],
	);
	const visibleTabs = useMemo(() => {
		if (activeTab === "all") {
			return filteredTabs;
		}

		return filteredTabs.filter((tab) => tab.name === activeTab);
	}, [activeTab, filteredTabs]);
	const entryItems = useMemo<VisibleEntryItem[]>(() => {
		if (!hasActiveQuery) {
			return visibleTabs.flatMap((tab) =>
				tab.entries.map((entry) => ({
					tabName: tab.name,
					entry,
				})),
			);
		}

		return sortedEntries
			.filter((entry) => activeTab === "all" || entry.tab === activeTab)
			.map((entry) => ({
				tabName: entry.tab,
				entry,
			}));
	}, [visibleTabs, sortedEntries, hasActiveQuery, activeTab]);
	const allEntries = dataset.tabs.flatMap((tab) => tab.entries);
	const entryMap = useMemo(
		() => new Map(allEntries.map((entry) => [entry.id, entry])),
		[allEntries],
	);
	const shouldRandomize = !hasActiveQuery && activeTab === "all";
	const orderedEntryItems = useMemo(() => {
		if (!shouldRandomize) {
			return entryItems;
		}

		const seed = shuffleSeedRef.current;
		return [...entryItems].sort((left, right) => {
			const leftScore = hashStringWithSeed(left.entry.id, seed);
			const rightScore = hashStringWithSeed(right.entry.id, seed);
			return leftScore - rightScore;
		});
	}, [entryItems, shouldRandomize]);
	const visibleEntries = orderedEntryItems.map((item) => item.entry);
	const visibleTabsCount =
		activeTab === "all" ? visibleTabs.length : visibleTabs.length;
	const totalAnnotations = allEntries.reduce(
		(count, entry) => count + entry.annotations.length,
		0,
	);
	const clickedEntries = useMemo(
		() =>
			clickedEntryIds
				.map((entryId) => entryMap.get(entryId))
				.filter(
					(
						entry,
					): entry is CompendiumDataset["tabs"][number]["entries"][number] =>
						Boolean(entry),
				),
		[clickedEntryIds, entryMap],
	);
	const hoveredEntry = hoverPreview
		? (entryMap.get(hoverPreview.entryId) ?? null)
		: null;

	const hoverCardStyle = useMemo(() => {
		if (!hoverPreview || typeof window === "undefined") {
			return null;
		}

		const centerX = hoverPreview.anchor.left + hoverPreview.anchor.width / 2;
		const maxLeft = window.innerWidth - HOVER_CARD_WIDTH - HOVER_CARD_MARGIN;
		const left = clamp(
			centerX - HOVER_CARD_WIDTH / 2,
			HOVER_CARD_MARGIN,
			maxLeft,
		);
		const top =
			hoverPreview.placement === "top"
				? hoverPreview.anchor.top - HOVER_CARD_OFFSET
				: hoverPreview.anchor.bottom + HOVER_CARD_OFFSET;

		return {
			left,
			top,
		};
	}, [hoverPreview]);

	useEffect(() => {
		if (activeTab === "all") {
			return;
		}

		if (!tabNames.includes(activeTab)) {
			void setTabQuery(null);
		}
	}, [activeTab, tabNames, setTabQuery]);

	useEffect(() => {
		setSearchInput(searchQuery ?? "");
	}, [searchQuery]);

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

	useEffect(() => {
		if (!hoverPreview) {
			return;
		}

		const hidePreview = () => {
			setHoverPreview(null);
		};

		window.addEventListener("scroll", hidePreview, true);
		window.addEventListener("resize", hidePreview);

		return () => {
			window.removeEventListener("scroll", hidePreview, true);
			window.removeEventListener("resize", hidePreview);
		};
	}, [hoverPreview]);

	const handleKeywordHover = ({
		keywordId,
		entryId,
		anchorRect,
	}: {
		keywordId: string;
		entryId: string;
		anchorRect: DOMRect;
	}) => {
		const referencedEntryId = keywordMap
			.get(keywordId)
			?.references.find((candidateId) => entryMap.has(candidateId));
		const targetEntryId = referencedEntryId ?? entryId;

		const placement: HoverPreviewState["placement"] =
			anchorRect.top > window.innerHeight - anchorRect.bottom
				? "top"
				: "bottom";

		setHoverPreview({
			entryId: targetEntryId,
			placement,
			anchor: {
				top: anchorRect.top,
				bottom: anchorRect.bottom,
				left: anchorRect.left,
				width: anchorRect.width,
			},
		});
	};

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

	const handleKeywordLeave = () => {
		setHoverPreview(null);
	};

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchInput(event.target.value);
	};

	const handleClearSearch = async () => {
		setSearchInput("");
		await setSearchQuery(null);
	};

	const handleRemoveClickedEntry = (entryId: string) => {
		setClickedEntryIds((currentIds) =>
			currentIds.filter((currentId) => currentId !== entryId),
		);
	};

	const handleClearClickedEntries = () => {
		setClickedEntryIds([]);
	};

	const renderEntryList = () => {
		if (orderedEntryItems.length === 0) {
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
							onClick={handleClearSearch}
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
				items={orderedEntryItems}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={handleKeywordLeave}
				onKeywordClick={handleKeywordClick}
			/>
		);
	};

	const renderClickedPanel = () => {
		return (
			<div className="flex flex-col p-5">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
							Clicked Tooltips
						</p>
						<p className="mt-1 text-xs text-white/60">
							{clickedEntries.length} item
							{clickedEntries.length === 1 ? "" : "s"}
						</p>
					</div>
					{clickedEntries.length > 0 ? (
						<button
							type="button"
							onClick={handleClearClickedEntries}
							className="rounded-xl border border-white/16 bg-white/8 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-white/70 uppercase transition hover:bg-white/14"
						>
							Clear all
						</button>
					) : null}
				</div>

				{clickedEntries.length > 0 ? (
					<div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
						{clickedEntries.map((entry) => (
							<div key={entry.id} className="space-y-2">
								<div className="flex justify-end">
									<button
										type="button"
										onClick={() => handleRemoveClickedEntry(entry.id)}
										className="rounded-lg border border-white/12 bg-white/8 p-1.5 text-white/70 transition hover:bg-white/14"
										aria-label={`Remove ${entry.title}`}
									>
										<X size={14} />
									</button>
								</div>
								<Tooltip
									entry={entry}
									entryMap={entryMap}
									keywordMap={keywordMap}
									onKeywordHover={handleKeywordHover}
									onKeywordLeave={handleKeywordLeave}
									onKeywordClick={handleKeywordClick}
								/>
							</div>
						))}
					</div>
				) : (
					<p className="mt-4 text-sm leading-7 text-white/62">
						Click any highlighted keyword to pin its tooltip here.
					</p>
				)}
			</div>
		);
	};

	return (
		<div className="relative flex min-h-screen w-full flex-col text-sm">
			<header className="border-b border-blue-500/50 backdrop-blur-md">
				<div className="">
					<div className="flex gap-3">
						<input
							id="compendium-search"
							type="search"
							value={searchInput}
							onChange={handleSearchChange}
							placeholder="Search by title, description, item hash, or perk hash"
							className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/65 focus:border-sky-300/60 focus:outline-none"
						/>
						{hasActiveQuery ? (
							<button
								type="button"
								onClick={handleClearSearch}
								className="border border-white/16 bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
							>
								Clear
							</button>
						) : null}
					</div>
					<div className="m-2 flex flex-row items-center gap-4">
						<p className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
							Filter:
						</p>
						<div
							className="flex flex-wrap gap-2"
							role="tablist"
							aria-label="Filter entries"
						>
							{(["all", ...tabNames] as TabFilter[]).map((tabName) => {
								const isActive = activeTab === tabName;
								const label = tabName === "all" ? "All" : tabName;

								return (
									<button
										key={tabName}
										type="button"
										onClick={() => setActiveTab(tabName)}
										role="tab"
										aria-selected={isActive}
										className={cn(
											"borderHover px-3 py-1.5 text-xs font-semibold tracking-[0.08em] uppercase transition",
											isActive
												? "border-sky-300/60 bg-sky-400/18 text-sky-100"
												: "border-white/14 bg-white/6 text-white/68 hover:bg-white/10",
										)}
									>
										{label}
									</button>
								);
							})}
						</div>
					</div>
					<div className="mt-4 lg:hidden">
						<button
							type="button"
							onClick={() => setIsMobileDrawerOpen(true)}
							className="rounded-xl border border-white/16 bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
						>
							Open clicked tooltips ({clickedEntries.length})
						</button>
					</div>
				</div>
			</header>

			<main className="mr-4 min-h-[60vh]">
				<div className="h-[70vh] lg:hidden">{renderEntryList()}</div>

				<Group
					orientation="horizontal"
					className="hidden max-h-[calc(100vh-2rem)] min-h-[60vh] lg:flex"
				>
					<Panel defaultSize="68%" minSize="40%">
						<div className="flex h-full flex-col">
							<div className="min-h-0 flex-1">{renderEntryList()}</div>
						</div>
					</Panel>
					<Separator className="group mx-2 flex w-2 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/12">
						<div className="h-18 w-1 rounded-full bg-white/30 transition group-hover:bg-sky-200/80" />
					</Separator>
					<Panel defaultSize="32%" minSize="15%" maxSize="50%">
						{renderClickedPanel()}
					</Panel>
				</Group>
			</main>

			{hoveredEntry && hoverCardStyle ? (
				<div
					className={cn(
						"pointer-events-none fixed z-50 w-130 bg-gray-900/50 shadow-2xl shadow-black/50",
						hoverPreview?.placement === "top"
							? "-translate-y-full"
							: "translate-y-0",
					)}
					style={{
						left: hoverCardStyle.left,
						top: hoverCardStyle.top,
					}}
				>
					<Tooltip
						entry={hoveredEntry}
						entryMap={entryMap}
						keywordMap={keywordMap}
						onKeywordHover={handleKeywordHover}
						onKeywordLeave={handleKeywordLeave}
						onKeywordClick={handleKeywordClick}
					/>
				</div>
			) : null}

			<div
				className={cn(
					"fixed inset-0 z-50 lg:hidden",
					isMobileDrawerOpen ? "pointer-events-auto" : "pointer-events-none",
				)}
				aria-hidden={!isMobileDrawerOpen}
			>
				<div
					className={cn(
						"absolute inset-0 bg-black/60 transition-opacity",
						isMobileDrawerOpen ? "opacity-100" : "opacity-0",
					)}
					onClick={() => setIsMobileDrawerOpen(false)}
				/>
				<aside
					className={cn(
						"absolute top-0 right-0 h-full w-[min(88vw,26rem)] border-l border-white/14 bg-black/92 p-4 shadow-2xl shadow-black/60 transition-transform",
						isMobileDrawerOpen ? "translate-x-0" : "translate-x-full",
					)}
				>
					<div className="flex items-center justify-between">
						<p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
							Clicked Tooltips
						</p>
						<button
							type="button"
							onClick={() => setIsMobileDrawerOpen(false)}
							className="rounded-lg border border-white/16 bg-white/8 p-1.5 text-white/75"
							aria-label="Close clicked tooltip drawer"
						>
							<X size={16} />
						</button>
					</div>

					{clickedEntries.length > 0 ? (
						<div className="mt-4 max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto pr-1">
							{clickedEntries.map((entry) => (
								<div key={`drawer-${entry.id}`} className="space-y-2">
									<div className="flex justify-end">
										<button
											type="button"
											onClick={() => handleRemoveClickedEntry(entry.id)}
											className="rounded-lg border border-white/12 bg-white/8 p-1.5 text-white/70 transition hover:bg-white/14"
											aria-label={`Remove ${entry.title}`}
										>
											<X size={14} />
										</button>
									</div>
									<Tooltip
										entry={entry}
										entryMap={entryMap}
										keywordMap={keywordMap}
										onKeywordHover={handleKeywordHover}
										onKeywordLeave={handleKeywordLeave}
										onKeywordClick={handleKeywordClick}
									/>
								</div>
							))}
						</div>
					) : (
						<p className="mt-4 text-sm text-white/62">
							Tap highlighted keywords to collect them here.
						</p>
					)}
				</aside>
			</div>

			<footer className="p-4 backdrop-blur-md md:px-6 lg:px-8">
				<h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
					Destiny 2 Knowledge
				</h1>
				<div className="mt-6 grid gap-3 md:grid-cols-4">
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Tabs
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{activeTab === "all"
								? `${visibleTabsCount}/${dataset.tabs.length}`
								: `${visibleTabsCount}/1`}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Entries
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{visibleEntries.length}/{allEntries.length}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Keywords
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{dataset.keywords.length}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Annotations
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{totalAnnotations}
						</div>
					</div>
				</div>

				<p className="mt-4 text-xs text-white/45">
					Generated {new Date(dataset.generatedAt).toLocaleString("de-DE")}
				</p>
			</footer>
		</div>
	);
}
