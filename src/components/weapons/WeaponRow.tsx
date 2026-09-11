"use client";

import { ChevronDown } from "lucide-react";

import { HoverPrefetchLink } from "@/components/site/HoverPrefetchLink";
import { cn } from "@/lib/utils/utils";
import { ENERGY_TEXT_CLASS, formatSeason } from "@/lib/weapons/display";
import type { LegendEntry, WeaponTierRow } from "@/lib/weapons/model";

import { TierBadge } from "./TierBadge";
import { WeaponIcon } from "./WeaponIcon";

// One definition per shape, used by the row and by the header above it, so the
// two can never drift apart. Spelled out rather than composed because Tailwind
// only ships the class strings it can see.
const WEAPON_GRID =
	"grid grid-cols-[2rem_2rem_minmax(0,1fr)_1.5rem] items-center gap-3 md:grid-cols-[2rem_2.5rem_minmax(0,1fr)_2rem_5rem_8rem_10rem_3.5rem_1.5rem]";

// With more than one weapon type in the list, the type has to be on the row:
// an Adaptive auto and an Adaptive pulse are otherwise indistinguishable.
const WEAPON_GRID_WITH_TYPE =
	"grid grid-cols-[2rem_2rem_minmax(0,1fr)_1.5rem] items-center gap-3 md:grid-cols-[2rem_2.5rem_minmax(0,1fr)_2rem_7rem_5rem_7rem_9rem_3.5rem_1.5rem]";

export function weaponGridClass(showType: boolean) {
	return showType ? WEAPON_GRID_WITH_TYPE : WEAPON_GRID;
}

export type PerkHoverHandlers = {
	// Null when the perk has no glossary entry, which is the normal case for the
	// stat rolls in the barrel, magazine and masterwork columns.
	entryIdForPerk: (name: string) => string | null;
	onPerkHover: (entryId: string, anchorRect: DOMRect) => void;
	onPerkLeave: () => void;
};

type WeaponRowProps = {
	row: WeaponTierRow;
	expanded: boolean;
	onToggle: () => void;
	tierLegend: LegendEntry[];
	// True when the list spans several weapon types.
	showType: boolean;
	perks: PerkHoverHandlers;
};

function PerkColumn({
	label,
	options,
	perks,
}: {
	label: string;
	options: string[];
	perks: PerkHoverHandlers;
}) {
	if (options.length === 0) return null;

	return (
		<div className="min-w-0">
			<p className="text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">
				{label}
			</p>
			<ul className="mt-1.5 space-y-1">
				{options.map((option) => (
					<li key={option}>
						{/* The glossary already holds every perk's text, so hovering
						    shows that entry and clicking hands off to its search. */}
						<HoverPrefetchLink
							href={`/glossary?q=${encodeURIComponent(option)}`}
							className="text-sm text-white/80 underline decoration-white/20 underline-offset-4 transition hover:text-sky-200 hover:decoration-sky-200/60"
							onMouseEnter={(event) => {
								const entryId = perks.entryIdForPerk(option);
								if (!entryId) return;
								perks.onPerkHover(
									entryId,
									event.currentTarget.getBoundingClientRect(),
								);
							}}
							onMouseLeave={perks.onPerkLeave}
							// Keyboard users get the card too: the anchor is the same.
							onFocus={(event) => {
								const entryId = perks.entryIdForPerk(option);
								if (!entryId) return;
								perks.onPerkHover(
									entryId,
									event.currentTarget.getBoundingClientRect(),
								);
							}}
							onBlur={perks.onPerkLeave}
						>
							{option}
						</HoverPrefetchLink>
					</li>
				))}
			</ul>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<span className="text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">
				{label}
			</span>{" "}
			<span className="text-sm text-white/80">{value}</span>
		</div>
	);
}

export function WeaponRow({
	row,
	expanded,
	onToggle,
	tierLegend,
	showType,
	perks,
}: WeaponRowProps) {
	const detailsId = `${row.id}-details`;

	const stats = [
		row.ammoSlot ? { label: "Ammo", value: row.ammoSlot } : null,
		row.reserves !== null
			? { label: "Reserves", value: String(row.reserves) }
			: null,
		row.charge != null ? { label: "Charge", value: String(row.charge) } : null,
		row.impact != null ? { label: "Impact", value: String(row.impact) } : null,
		row.shield != null ? { label: "Shield", value: String(row.shield) } : null,
		row.enhanceable !== null
			? { label: "Enhanceable", value: row.enhanceable ? "Yes" : "No" }
			: null,
	].filter((stat) => stat !== null);

	return (
		<div className="border-b border-blue-500/15 last:border-b-0">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={expanded}
				aria-controls={detailsId}
				className={cn(
					weaponGridClass(showType),
					"w-full cursor-pointer px-3 py-2 text-left transition hover:bg-blue-500/10",
					expanded && "bg-blue-500/10",
				)}
			>
				<WeaponIcon
					name={row.name}
					iconPath={row.iconPath}
					watermarkPath={row.watermarkPath}
				/>
				<span className="hidden text-sm text-white/45 tabular-nums md:block">
					{row.rank ?? "-"}
				</span>
				<span className="min-w-0">
					<span className="block truncate text-sm font-semibold text-white">
						{row.name}
					</span>
					{/* The type has a column of its own on desktop; on a phone that
					    column is hidden, so it rides under the name instead. */}
					{showType ? (
						<span className="block truncate text-xs text-white/50 md:hidden">
							{row.categoryLabel}
						</span>
					) : null}
					{row.nameNote ? (
						<span className="block truncate text-xs text-white/50">
							{row.nameNote}
						</span>
					) : null}
				</span>
				<TierBadge tier={row.tier} legend={tierLegend} />
				{showType ? (
					<span className="hidden truncate text-sm text-white/70 md:block">
						{row.categoryLabel}
					</span>
				) : null}
				<span
					className={cn(
						"hidden text-sm md:block",
						ENERGY_TEXT_CLASS[row.energy ?? "Kinetic"],
					)}
				>
					{row.energy ?? "-"}
				</span>
				<span className="hidden truncate text-sm text-white/70 md:block">
					{row.frame ?? "-"}
				</span>
				<span className="hidden truncate text-sm text-white/60 md:block">
					{row.source ?? "-"}
				</span>
				<span className="hidden text-sm text-white/50 tabular-nums md:block">
					{formatSeason(row.season)}
				</span>
				<ChevronDown
					aria-hidden
					className={cn(
						"size-4 text-white/40 transition",
						expanded && "rotate-180",
					)}
				/>
			</button>

			{expanded ? (
				<div
					id={detailsId}
					className="border-t border-blue-500/15 bg-blue-950/20 px-3 py-4"
				>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<PerkColumn label="Barrel" options={row.barrels} perks={perks} />
						<PerkColumn
							label="Magazine"
							options={row.magazines}
							perks={perks}
						/>
						<PerkColumn
							label="Masterwork"
							options={row.masterworks}
							perks={perks}
						/>
						<PerkColumn label="Perk 1" options={row.perks1} perks={perks} />
						<PerkColumn label="Perk 2" options={row.perks2} perks={perks} />
						<PerkColumn
							label="Origin Trait"
							options={row.originTraits}
							perks={perks}
						/>
					</div>

					{stats.length > 0 ? (
						<div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
							{stats.map((stat) => (
								<Stat key={stat.label} label={stat.label} value={stat.value} />
							))}
						</div>
					) : null}

					{row.notes ? (
						<p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
							{row.notes}
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
