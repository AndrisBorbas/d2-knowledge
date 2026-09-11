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
import { statusForTab } from "@/lib/weapons/display";
import type { WeaponsDataset } from "@/lib/weapons/model";

import { EXOTIC_GRID_CLASS, EXOTIC_USE_LABELS, ExoticRow } from "./ExoticRow";
import { SheetCredit } from "./SheetCredit";
import { WEAPON_GRID_CLASS, WeaponRow } from "./WeaponRow";

// The exotic tab is not one of the 20 archetype tabs, but it reads as one more
// category in the same picker.
export const EXOTICS_SLUG = "exotics";

type TierListViewProps = {
	dataset: WeaponsDataset;
	category: string;
	onCategoryChange: (slug: string) => void;
	query: string;
	tiers: string[];
	energies: string[];
	expandedId: string | null;
	onToggleRow: (id: string) => void;
};

const HEADER_CLASS =
	"text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase";

export function TierListView({
	dataset,
	category,
	onCategoryChange,
	query,
	tiers,
	energies,
	expandedId,
	onToggleRow,
}: TierListViewProps) {
	const isExotics = category === EXOTICS_SLUG;

	// Two shapes, two lists: an exotic is rated on four uses rather than on a
	// recommended roll, so nothing downstream is shared but the search.
	const exoticRows = useMemo(() => {
		if (!isExotics) return [];
		const filtered = dataset.exotics.filter(
			(row) => tiers.length === 0 || (row.tier && tiers.includes(row.tier)),
		);
		return fuzzyFilterWeapons(filtered, query);
	}, [dataset.exotics, isExotics, query, tiers]);

	const weaponRows = useMemo(() => {
		if (isExotics) return [];
		const filtered = dataset.tierRows.filter((row) => {
			if (row.categorySlug !== category) return false;
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
		return fuzzyFilterWeapons(filtered, query);
	}, [dataset.tierRows, category, isExotics, query, tiers, energies]);

	const rowCount = isExotics ? exoticRows.length : weaponRows.length;

	const activeCategory = dataset.categories.find(
		(entry) => entry.slug === category,
	);
	const tab = isExotics ? EXOTICS_TAB.tab : (activeCategory?.tab ?? "");
	const gid = isExotics ? EXOTICS_TAB.gid : activeCategory?.gid;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{dataset.categories.map((entry) => (
					<Button
						key={entry.slug}
						variant="subtle"
						size="xs"
						active={entry.slug === category}
						aria-pressed={entry.slug === category}
						onClick={() => {
							onCategoryChange(entry.slug);
						}}
					>
						{entry.label}
					</Button>
				))}
				<Button
					variant="subtle"
					size="xs"
					active={isExotics}
					aria-pressed={isExotics}
					onClick={() => {
						onCategoryChange(EXOTICS_SLUG);
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

			<div className="border border-blue-500/40 bg-black/45 backdrop-blur-md">
				<div
					className={cn(
						isExotics ? EXOTIC_GRID_CLASS : WEAPON_GRID_CLASS,
						"border-b border-blue-500/40 px-3 py-2",
					)}
				>
					<span aria-hidden />
					{isExotics ? (
						<>
							<span className={HEADER_CLASS}>Weapon</span>
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
						</>
					) : (
						<>
							<span className={cn(HEADER_CLASS, "hidden md:block")}>#</span>
							<span className={HEADER_CLASS}>Weapon</span>
							<span className={HEADER_CLASS}>Tier</span>
							<span className={cn(HEADER_CLASS, "hidden md:block")}>
								Energy
							</span>
							<span className={cn(HEADER_CLASS, "hidden md:block")}>Frame</span>
							<span className={cn(HEADER_CLASS, "hidden md:block")}>
								Source
							</span>
							<span className={cn(HEADER_CLASS, "hidden md:block")}>
								Season
							</span>
						</>
					)}
					<span aria-hidden />
				</div>

				{rowCount === 0 ? (
					<p className="px-3 py-8 text-center text-sm text-white/60">
						Nothing matches those filters.
					</p>
				) : null}

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

				{weaponRows.map((row) => (
					<WeaponRow
						key={row.id}
						row={row}
						expanded={expandedId === row.id}
						onToggle={() => {
							onToggleRow(row.id);
						}}
						tierLegend={dataset.tierLegend}
					/>
				))}
			</div>

			<p className="text-xs text-white/45">
				{rowCount} {rowCount === 1 ? "weapon" : "weapons"}
			</p>
		</div>
	);
}
