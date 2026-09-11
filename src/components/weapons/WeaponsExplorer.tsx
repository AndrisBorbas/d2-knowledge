"use client";

import {
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
} from "nuqs";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ENERGY_TYPES, TIER_RANKS } from "@/lib/aegis/config";
import { cn } from "@/lib/utils/utils";
import { RANK_TEXT_CLASS } from "@/lib/weapons/display";
import type { WeaponsDataset } from "@/lib/weapons/model";

import { ArchetypesView } from "./ArchetypesView";
import { type DamageTab, DamageView } from "./DamageView";
import { SheetHeader } from "./SheetHeader";
import { EXOTICS_SLUG, TierListView } from "./TierListView";
import { useWeaponsDataset } from "./useWeaponsDataset";

const VIEWS = [
	["tiers", "Tier lists"],
	["archetypes", "Archetypes"],
	["damage", "Damage"],
] as const;

const VIEW_KEYS = VIEWS.map(([key]) => key);
const DAMAGE_TAB_KEYS = ["shots", "sustained", "bosses"] as const;

// Same throttle the compendium search uses, so typing does not push a history
// entry per keystroke.
const URL_OPTIONS = {
	history: "push" as const,
	limitUrlUpdates: { method: "throttle" as const, timeMs: 200 },
};

const SEARCH_DEBOUNCE_MS = 300;

type WeaponsExplorerProps = {
	seed: WeaponsDataset;
};

export function WeaponsExplorer({ seed }: WeaponsExplorerProps) {
	const { dataset, isComplete } = useWeaponsDataset(seed);

	const [view, setView] = useQueryState(
		"v",
		parseAsStringLiteral(VIEW_KEYS)
			.withDefault("tiers")
			.withOptions(URL_OPTIONS),
	);
	const [category, setCategory] = useQueryState(
		"c",
		parseAsString
			.withDefault(seed.categories[0]?.slug ?? EXOTICS_SLUG)
			.withOptions(URL_OPTIONS),
	);
	const [damageTab, setDamageTab] = useQueryState(
		"d",
		parseAsStringLiteral(DAMAGE_TAB_KEYS)
			.withDefault("sustained")
			.withOptions(URL_OPTIONS),
	);
	const [query, setQuery] = useQueryState(
		"q",
		parseAsString.withDefault("").withOptions(URL_OPTIONS),
	);
	const [tiers, setTiers] = useQueryState(
		"t",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions(URL_OPTIONS),
	);
	const [energies, setEnergies] = useQueryState(
		"e",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions(URL_OPTIONS),
	);
	const [expandedId, setExpandedId] = useQueryState(
		"x",
		parseAsString.withOptions(URL_OPTIONS),
	);

	// The input stays instant while the URL catches up on a debounce, the same
	// split `useEntryFiltering` uses.
	const [searchInput, setSearchInput] = useState(query);
	useEffect(() => {
		if (searchInput === query) return;
		const timer = setTimeout(() => {
			void setQuery(searchInput || null);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [searchInput, query, setQuery]);

	const toggleFrom = (
		current: string[],
		value: string,
		set: (next: string[] | null) => void,
	) => {
		const next = current.includes(value)
			? current.filter((entry) => entry !== value)
			: [...current, value];
		set(next.length > 0 ? next : null);
	};

	const hasFilters =
		searchInput.length > 0 || tiers.length > 0 || energies.length > 0;

	const clearFilters = () => {
		setSearchInput("");
		void setQuery(null);
		void setTiers(null);
		void setEnergies(null);
	};

	// Only the tier lists are filtered by element, and only they and the exotics
	// are ranked, so the chip strip follows the view rather than always showing
	// controls that do nothing.
	const showTierChips = view === "tiers";
	const showEnergyChips = view === "tiers" && category !== EXOTICS_SLUG;

	return (
		<div className="mx-auto flex w-full max-w-[100rem] flex-col gap-6 px-4 py-8 md:px-6">
			<SheetHeader dataset={dataset} isComplete={isComplete} />

			<div className="flex flex-wrap gap-2">
				{VIEWS.map(([key, label]) => (
					<Button
						key={key}
						variant="subtle"
						size="md"
						active={view === key}
						aria-pressed={view === key}
						onClick={() => {
							void setView(key === "tiers" ? null : key);
						}}
					>
						{label}
					</Button>
				))}
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex gap-3">
					<input
						id="weapons-search"
						type="search"
						value={searchInput}
						onChange={(event) => {
							setSearchInput(event.target.value);
						}}
						placeholder="Search by weapon, frame, perk, source, or note..."
						className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/65 focus:border-sky-300/60 focus:outline-none"
					/>
					{hasFilters ? (
						<Button size="md" onClick={clearFilters}>
							Clear
						</Button>
					) : null}
				</div>

				{showTierChips || showEnergyChips ? (
					<div className="flex flex-wrap items-center gap-2">
						{showTierChips
							? TIER_RANKS.map((rank) => (
									<Button
										key={rank}
										variant="option"
										size="chip"
										active={tiers.includes(rank)}
										aria-pressed={tiers.includes(rank)}
										className={cn(
											!tiers.includes(rank) && RANK_TEXT_CLASS[rank],
										)}
										onClick={() => {
											toggleFrom(tiers, rank, setTiers);
										}}
									>
										{rank}
									</Button>
								))
							: null}

						{showEnergyChips ? (
							<span aria-hidden className="mx-1 h-5 w-px bg-blue-500/40" />
						) : null}

						{showEnergyChips
							? ENERGY_TYPES.map((energy) => (
									<Button
										key={energy}
										variant="option"
										size="chip"
										active={energies.includes(energy)}
										aria-pressed={energies.includes(energy)}
										onClick={() => {
											toggleFrom(energies, energy, setEnergies);
										}}
									>
										{energy}
									</Button>
								))
							: null}
					</div>
				) : null}
			</div>

			{view === "tiers" ? (
				<TierListView
					dataset={dataset}
					category={category}
					onCategoryChange={(slug) => {
						void setCategory(slug === seed.categories[0]?.slug ? null : slug);
						void setExpandedId(null);
					}}
					query={query}
					tiers={tiers}
					energies={energies}
					expandedId={expandedId}
					onToggleRow={(id) => {
						void setExpandedId(expandedId === id ? null : id);
					}}
				/>
			) : null}

			{view === "archetypes" ? (
				<ArchetypesView dataset={dataset} query={query} />
			) : null}

			{view === "damage" ? (
				<DamageView
					dataset={dataset}
					query={query}
					tab={damageTab}
					onTabChange={(next: DamageTab) => {
						void setDamageTab(next === "sustained" ? null : next);
					}}
				/>
			) : null}
		</div>
	);
}
