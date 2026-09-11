"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { SYMBOL_CLASS, SYMBOL_GLYPH } from "@/lib/weapons/display";
import type {
	ExoticWeaponRow,
	LegendEntry,
	SymbolRating,
} from "@/lib/weapons/model";

import { TierBadge } from "./TierBadge";
import { WeaponIcon } from "./WeaponIcon";

// The exotic tab rates four separate uses rather than listing a roll, so it
// gets its own columns.
export const EXOTIC_GRID_CLASS =
	"grid grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-center gap-3 md:grid-cols-[2rem_minmax(0,1fr)_2rem_5rem_10rem_2rem_2rem_2rem_2rem_1.5rem]";

export const EXOTIC_USE_LABELS = [
	["roam", "Roam"],
	["dps", "DPS"],
	["challenge", "Chall"],
	["speed", "Speed"],
] as const;

type ExoticRowProps = {
	row: ExoticWeaponRow;
	expanded: boolean;
	onToggle: () => void;
	tierLegend: LegendEntry[];
	symbolLegend: LegendEntry[];
};

function UseCell({
	rating,
	label,
	symbolLegend,
}: {
	rating: SymbolRating | null;
	label: string;
	symbolLegend: LegendEntry[];
}) {
	if (!rating) {
		return <span className="hidden text-white/25 md:block">-</span>;
	}

	const glyph = SYMBOL_GLYPH[rating];
	const meaning = symbolLegend.find((entry) => entry.symbol === glyph)?.meaning;

	return (
		<span
			title={meaning ? `${label}: ${meaning}` : label}
			className={cn(
				"hidden text-center text-sm md:block",
				SYMBOL_CLASS[rating],
			)}
		>
			{glyph}
		</span>
	);
}

export function ExoticRow({
	row,
	expanded,
	onToggle,
	tierLegend,
	symbolLegend,
}: ExoticRowProps) {
	const detailsId = `${row.id}-details`;

	return (
		<div className="border-b border-blue-500/15 last:border-b-0">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={expanded}
				aria-controls={detailsId}
				className={cn(
					EXOTIC_GRID_CLASS,
					"w-full cursor-pointer px-3 py-2 text-left transition hover:bg-blue-500/10",
					expanded && "bg-blue-500/10",
				)}
			>
				<WeaponIcon
					name={row.name}
					iconPath={row.iconPath}
					watermarkPath={row.watermarkPath}
				/>
				<span className="min-w-0">
					<span className="block truncate text-sm font-semibold text-white">
						{row.name}
					</span>
					<span className="block truncate text-xs text-white/50 md:hidden">
						{row.tags.join(", ")}
					</span>
				</span>
				<TierBadge tier={row.tier} legend={tierLegend} />
				<span className="hidden text-sm text-white/70 capitalize md:block">
					{row.slot ?? "-"}
				</span>
				<span className="hidden truncate text-sm text-white/60 md:block">
					{row.tags.join(", ") || "-"}
				</span>
				{EXOTIC_USE_LABELS.map(([key, label]) => (
					<UseCell
						key={key}
						rating={row[key]}
						label={label}
						symbolLegend={symbolLegend}
					/>
				))}
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
					className="space-y-3 border-t border-blue-500/15 bg-blue-950/20 px-3 py-4"
				>
					{row.description ? (
						<p className="max-w-3xl text-sm leading-6 text-white/80">
							{row.description}
						</p>
					) : null}
					{row.usage ? (
						<p className="max-w-3xl text-sm leading-6 text-white/72">
							{row.usage}
						</p>
					) : null}
					<div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70">
						{row.season !== null ? <span>Season {row.season}</span> : null}
						{row.reserves !== null ? (
							<span>Reserves {row.reserves}</span>
						) : null}
						{EXOTIC_USE_LABELS.map(([key, label]) => {
							const rating = row[key];
							if (!rating) return null;
							const glyph = SYMBOL_GLYPH[rating];
							const meaning = symbolLegend.find(
								(entry) => entry.symbol === glyph,
							)?.meaning;
							return (
								<span key={key}>
									{label}{" "}
									<span className={SYMBOL_CLASS[rating]}>
										{meaning ?? glyph}
									</span>
								</span>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
