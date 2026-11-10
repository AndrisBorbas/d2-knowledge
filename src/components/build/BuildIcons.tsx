"use client";

import Image from "next/image";

import type { AnnotatedEntry } from "@/lib/compendium/model";
import type { DimIndexStatMod } from "@/lib/dim/index-schema";
import type { ResolvedItem } from "@/lib/dim/resolve";
import { cn } from "@/lib/utils/utils";

// What an icon needs to show the preview card on hover and pin the entry on
// click, the same pair the artifact and subclass pages use.
export type IconHandlers = {
	pinnedIds: Set<string>;
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
};

const DEFAULT_ICON_BORDER_CLASS = "border-white/20";

// The dots the game draws under an aspect: one per fragment slot it grants.
function FragmentSlotDots({ count }: { count: number }) {
	return (
		<span
			className="flex gap-0.5"
			aria-label={`${String(count)} fragment slots`}
		>
			{Array.from({ length: count }, (_, index) => (
				<span key={index} className="size-1.5 bg-white/70" />
			))}
		</span>
	);
}

// The stat changes a fragment makes, green for a gain and red for a cost.
function StatMods({ statMods }: { statMods: DimIndexStatMod[] }) {
	return (
		<span className="flex flex-wrap gap-x-2 gap-y-0.5">
			{statMods.map((mod) => (
				<span
					key={mod.n}
					className={cn(
						"text-xs tracking-wide",
						mod.v > 0 ? "text-emerald-300" : "text-red-300",
					)}
				>
					{mod.v > 0 ? "+" : ""}
					{mod.v} {mod.n}
				</span>
			))}
		</span>
	);
}

// One entry as a button, laid out like the subclass pages' option buttons: the
// icon, the name, and the extras the game shows with it (an aspect's fragment
// slots, a fragment's stat changes). The full description is on the hover card
// and in the pinned panel.
export function EntryIconButton({
	entry,
	count = 1,
	borderClass = DEFAULT_ICON_BORDER_CLASS,
	fragmentSlots,
	statMods,
	handlers,
}: {
	entry: AnnotatedEntry;
	count?: number;
	// The icon's frame, which a subclass plug takes from its element.
	borderClass?: string;
	// How many fragment slots the entry grants, if it is an aspect.
	fragmentSlots?: number;
	// The stat changes the entry makes, if it is a fragment.
	statMods?: DimIndexStatMod[];
	handlers: IconHandlers;
}) {
	const isPinned = handlers.pinnedIds.has(entry.id);

	return (
		<button
			type="button"
			aria-pressed={isPinned}
			onMouseEnter={(event) =>
				handlers.onHover(entry.id, event.currentTarget.getBoundingClientRect())
			}
			onFocus={(event) =>
				handlers.onHover(entry.id, event.currentTarget.getBoundingClientRect())
			}
			onMouseLeave={handlers.onLeave}
			onBlur={handlers.onLeave}
			onClick={() => handlers.onToggle(entry.id)}
			className={cn(
				"borderHover flex min-w-0 items-center gap-3 bg-white/5 p-2 pr-3 text-left backdrop-blur-sm transition hover:after:border-t",
				isPinned
					? "borderActive bg-white/20 after:border-t"
					: "hover:bg-white/12",
			)}
		>
			{entry.iconPath ? (
				<Image
					src={entry.iconPath}
					alt=""
					width={48}
					height={48}
					className={cn("size-12 shrink-0 border object-cover", borderClass)}
				/>
			) : (
				<span className="size-12 shrink-0 border border-dashed border-white/20" />
			)}
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="flex items-baseline gap-1.5">
					<span className="max-w-52 truncate text-base font-semibold text-white/90">
						{entry.title}
					</span>
					{count > 1 ? (
						<span className="text-masterwork text-sm font-bold">×{count}</span>
					) : null}
				</span>
				{fragmentSlots ? <FragmentSlotDots count={fragmentSlots} /> : null}
				{statMods && statMods.length > 0 ? (
					<StatMods statMods={statMods} />
				) : null}
			</span>
		</button>
	);
}

export function IconRow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ItemHeader({ item }: { item: ResolvedItem }) {
	return (
		<div className="flex items-center gap-3">
			{item.iconPath ? (
				<div className="relative border border-white/20 bg-black/50">
					<Image
						src={item.iconPath}
						alt=""
						width={48}
						height={48}
						className="size-12 object-cover"
					/>
				</div>
			) : (
				<div className="flex size-12 items-center justify-center border border-dashed border-white/20 bg-black/30 text-xs text-white/45">
					?
				</div>
			)}
			<div>
				<h3 className="text-lg font-semibold text-white">
					{item.name ?? "Unknown item"}
				</h3>
				<p className="text-xs tracking-[0.12em] text-white/55 uppercase">
					{[
						item.tierLabel,
						item.isEquipped ? "Equipped" : "In inventory",
						item.name ? null : `Hash ${String(item.hash)}`,
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>
		</div>
	);
}
