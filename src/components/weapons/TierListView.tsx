"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import {
	ENDGAME_SHEET_URL,
	EXOTICS_TAB,
	sheetTabUrl,
} from "@/lib/aegis/config";
import { fuzzyFilterWeapons } from "@/lib/utils/fuzzy";
import { cn } from "@/lib/utils/utils";
import { compareTierRows, statusForTab } from "@/lib/weapons/display";
import type { WeaponsDataset } from "@/lib/weapons/model";

import { EXOTIC_GRID_CLASS, EXOTIC_USE_LABELS, ExoticRow } from "./ExoticRow";
import { SheetCredit } from "./SheetCredit";
import {
	type PerkHoverHandlers,
	weaponGridClass,
	WeaponRow,
} from "./WeaponRow";

// The exotic tab is not one of the 20 archetype tabs, but it reads as one more
// category in the same picker.
export const EXOTICS_SLUG = "exotics";

type TierListViewProps = {
	dataset: WeaponsDataset;
	// Empty means every category, which is the default. Additive otherwise.
	categories: string[];
	onToggleCategory: (slug: string) => void;
	query: string;
	tiers: string[];
	energies: string[];
	expandedId: string | null;
	onToggleRow: (id: string) => void;
	perks: PerkHoverHandlers;
};

const HEADER_CLASS =
	"text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase";

export function TierListView({
	dataset,
	categories,
	onToggleCategory,
	query,
	tiers,
	energies,
	expandedId,
	onToggleRow,
	perks,
}: TierListViewProps) {
	// No selection is the same as selecting everything, so the page opens on the
	// whole list rather than on whichever tab happened to be first.
	const selected = new Set(categories);
	const showAll = selected.size === 0;
	const showExotics = showAll || selected.has(EXOTICS_SLUG);
	// Every legendary category is in view unless the only thing picked is
	// exotics.
	const legendaryCategories = dataset.categories.filter(
		(entry) => showAll || selected.has(entry.slug),
	);

	// Two shapes, two lists: an exotic is rated on four uses rather than on a
	// recommended roll, so nothing downstream is shared but the search.
	const exoticRows = useMemo(() => {
		if (!showExotics) return [];
		const filtered = dataset.exotics.filter(
			(row) => tiers.length === 0 || (row.tier && tiers.includes(row.tier)),
		);
		return fuzzyFilterWeapons(filtered, query);
	}, [dataset.exotics, showExotics, query, tiers]);

	const weaponRows = useMemo(() => {
		const wanted = new Set(legendaryCategories.map((entry) => entry.slug));
		if (wanted.size === 0) return [];

		const filtered = dataset.tierRows.filter((row) => {
			if (!wanted.has(row.categorySlug)) return false;
			if (tiers.length > 0 && (!row.tier || !tiers.includes(row.tier))) {
				return false;
			}
			if (
				energies.length > 0 &&
				(!row.energy || !energies.includes(row.energy))
			) {
				return false;
			}
			return true;
		});
		const searched = fuzzyFilterWeapons(filtered, query);
		// One tab keeps the sheet's own order. A search keeps relevance order,
		// since that is what was asked for. Anything else spans tabs, where the
		// per-tab rank alone would interleave nonsensically.
		if (query.trim().length > 0 || wanted.size === 1) return searched;
		return [...searched].sort(compareTierRows);
	}, [dataset.tierRows, legendaryCategories, query, tiers, energies]);

	const rowCount = weaponRows.length + exoticRows.length;
	// Only worth a column when there is more than one type to tell apart.
	const showType = legendaryCategories.length > 1;

	// The credit line can name one source tab; with a mixed selection it falls
	// back to naming the sheet alone.
	const onlyLegendary =
		legendaryCategories.length === 1 && !showExotics
			? legendaryCategories[0]
			: null;
	const onlyExotics = showExotics && legendaryCategories.length === 0;
	const tab = onlyExotics ? EXOTICS_TAB.tab : (onlyLegendary?.tab ?? "");
	const gid = onlyExotics ? EXOTICS_TAB.gid : onlyLegendary?.gid;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{dataset.categories.map((entry) => (
					<Button
						key={entry.slug}
						variant="subtle"
						size="xs"
						active={selected.has(entry.slug)}
						aria-pressed={selected.has(entry.slug)}
						onClick={() => {
							onToggleCategory(entry.slug);
						}}
					>
						{entry.label}
					</Button>
				))}
				<Button
					variant="subtle"
					size="xs"
					active={selected.has(EXOTICS_SLUG)}
					aria-pressed={selected.has(EXOTICS_SLUG)}
					onClick={() => {
						onToggleCategory(EXOTICS_SLUG);
					}}
				>
					Exotics
				</Button>
			</div>

			<SheetCredit
				sheet="endgame"
				status={statusForTab(dataset.status, tab)}
				tabUrl={gid ? sheetTabUrl(ENDGAME_SHEET_URL, gid) : undefined}
				tabLabel={tab}
			/>

			{rowCount === 0 ? (
				<div className="border border-blue-500/40 bg-black/45 px-3 py-8 backdrop-blur-md">
					<p className="text-center text-sm text-white/60">
						Nothing matches those filters.
					</p>
				</div>
			) : null}

			{/* Legendaries and exotics are rated on different things, so a mixed
			    selection gets a table each rather than one table of half-empty
			    cells. */}
			{weaponRows.length > 0 ? (
				<div className="border border-blue-500/40 bg-black/45 backdrop-blur-md">
					<div
						className={cn(
							weaponGridClass(showType),
							"border-b border-blue-500/40 px-3 py-2",
						)}
					>
						<span aria-hidden />
						<span className={cn(HEADER_CLASS, "hidden md:block")}>#</span>
						<span className={HEADER_CLASS}>Weapon</span>
						<span className={HEADER_CLASS}>Tier</span>
						{showType ? (
							<span className={cn(HEADER_CLASS, "hidden md:block")}>Type</span>
						) : null}
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Energy</span>
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Frame</span>
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Source</span>
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Season</span>
						<span aria-hidden />
					</div>

					{weaponRows.map((row) => (
						<WeaponRow
							key={row.id}
							row={row}
							expanded={expandedId === row.id}
							onToggle={() => {
								onToggleRow(row.id);
							}}
							tierLegend={dataset.tierLegend}
							showType={showType}
							perks={perks}
						/>
					))}
				</div>
			) : null}

			{exoticRows.length > 0 ? (
				<div className="border border-blue-500/40 bg-black/45 backdrop-blur-md">
					<div
						className={cn(
							EXOTIC_GRID_CLASS,
							"border-b border-blue-500/40 px-3 py-2",
						)}
					>
						<span aria-hidden />
						<span className={HEADER_CLASS}>Exotic</span>
						<span className={HEADER_CLASS}>Tier</span>
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Slot</span>
						<span className={cn(HEADER_CLASS, "hidden md:block")}>Tags</span>
						{EXOTIC_USE_LABELS.map(([key, label]) => (
							<span
								key={key}
								className={cn(HEADER_CLASS, "hidden text-center md:block")}
							>
								{label}
							</span>
						))}
						<span aria-hidden />
					</div>

					{exoticRows.map((row) => (
						<ExoticRow
							key={row.id}
							row={row}
							expanded={expandedId === row.id}
							onToggle={() => {
								onToggleRow(row.id);
							}}
							tierLegend={dataset.tierLegend}
							symbolLegend={dataset.symbolLegend}
						/>
					))}
				</div>
			) : null}

			<p className="text-xs text-white/45">
				{weaponRows.length} {weaponRows.length === 1 ? "weapon" : "weapons"}
				{exoticRows.length > 0 ? `, ${exoticRows.length} exotics` : null}
			</p>
		</div>
	);
}
