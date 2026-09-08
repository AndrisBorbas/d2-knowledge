"use client";

import Image from "next/image";

import type { SubclassOption, SubclassSlot } from "@/lib/compendium/subclasses";
import { cn } from "@/lib/utils/utils";

import { ELEMENT_BORDER_CLASS, ELEMENT_TEXT_CLASS } from "./elementStyles";

type AbilitySlotGridProps = {
	slot: SubclassSlot;
	elementSlug: string;
	// The class the subclass belongs to, for the "Hunter only" label.
	classLabel: string;
	pinnedIds: string[];
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
	// Aspects and fragments read better stacked in a narrow column; the
	// equipped-ability slots read better as a row of icons.
	layout?: "row" | "grid";
};

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

function StatMods({ option }: { option: SubclassOption }) {
	if (!option.statMods || option.statMods.length === 0) return null;

	return (
		<span className="flex flex-wrap gap-x-2 gap-y-0.5">
			{option.statMods.map((mod) => (
				<span
					key={mod.name}
					className={cn(
						"text-[11px] tracking-wide",
						mod.value > 0 ? "text-emerald-300" : "text-red-300",
					)}
				>
					{mod.value > 0 ? "+" : ""}
					{mod.value} {mod.name}
				</span>
			))}
		</span>
	);
}

// A super's icon is a diamond drawn inside a square, transparent image, where
// every other slot's icon fills its square. Framing one in a square box leaves
// the frame floating around the art, so the frame is a square turned 45
// degrees: at a side of the image's width over root 2 its corners land on the
// diamond's own.
function OptionIcon({
	option,
	elementSlug,
	isDiamond,
}: {
	option: SubclassOption;
	elementSlug: string;
	isDiamond: boolean;
}) {
	const borderClass = ELEMENT_BORDER_CLASS[elementSlug] ?? "border-white/20";

	if (!option.iconPath) {
		return (
			<span className="size-12 shrink-0 border border-dashed border-white/20" />
		);
	}

	if (!isDiamond) {
		return (
			<Image
				src={option.iconPath}
				alt=""
				width={48}
				height={48}
				className={cn("size-12 shrink-0 border object-cover", borderClass)}
			/>
		);
	}

	return (
		<span className="relative flex size-12 shrink-0 items-center justify-center">
			<Image
				src={option.iconPath}
				alt=""
				width={48}
				height={48}
				className="size-12 object-contain"
			/>
			<span
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute size-[2.125rem] rotate-45 border",
					borderClass,
				)}
			/>
		</span>
	);
}

function OptionButton({
	option,
	elementSlug,
	isDiamond,
	isPinned,
	onHover,
	onLeave,
	onToggle,
}: {
	option: SubclassOption;
	elementSlug: string;
	isDiamond: boolean;
	isPinned: boolean;
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
}) {
	const entryId = option.entryId;

	return (
		<button
			type="button"
			disabled={!entryId}
			aria-pressed={isPinned}
			onMouseEnter={(event) => {
				if (entryId)
					onHover(entryId, event.currentTarget.getBoundingClientRect());
			}}
			onFocus={(event) => {
				if (entryId)
					onHover(entryId, event.currentTarget.getBoundingClientRect());
			}}
			onMouseLeave={onLeave}
			onBlur={onLeave}
			onClick={() => {
				if (entryId) onToggle(entryId);
			}}
			className={cn(
				"borderHover flex min-w-0 items-center gap-2 bg-white/5 p-2 text-left backdrop-blur-sm transition hover:after:border-t",
				isPinned
					? "borderActive bg-white/20 after:border-t"
					: "hover:bg-white/12",
				!entryId && "cursor-default opacity-70",
			)}
		>
			<OptionIcon
				option={option}
				elementSlug={elementSlug}
				isDiamond={isDiamond}
			/>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-semibold text-white/90">
					{option.name}
				</span>
				{option.fragmentSlots ? (
					<FragmentSlotDots count={option.fragmentSlots} />
				) : null}
				<StatMods option={option} />
			</span>
		</button>
	);
}

export function AbilitySlotGrid({
	slot,
	elementSlug,
	classLabel,
	pinnedIds,
	onHover,
	onLeave,
	onToggle,
	layout = "grid",
}: AbilitySlotGridProps) {
	const pinned = new Set(pinnedIds);
	const isDiamond = slot.id === "supers";

	return (
		<section className="flex flex-col gap-2">
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/15 pb-1">
				<h2
					className={cn(
						"text-sm font-semibold tracking-[0.2em] uppercase",
						ELEMENT_TEXT_CLASS[elementSlug] ?? "text-white",
					)}
				>
					{slot.label}
				</h2>
				<p className="text-[11px] tracking-[0.16em] text-white/45 uppercase">
					{slot.shared ? "All classes" : `${classLabel} only`} ·{" "}
					{slot.options.length}
				</p>
			</header>

			<div
				className={cn(
					"gap-2",
					// Container queries, not viewport ones: this sits inside a
					// resizable panel whose width has nothing to do with the screen.
					layout === "row"
						? "flex flex-wrap"
						: "grid grid-cols-1 @xl:grid-cols-2 @6xl:grid-cols-1",
				)}
			>
				{slot.options.map((option) => (
					<OptionButton
						key={option.hash}
						option={option}
						elementSlug={elementSlug}
						isDiamond={isDiamond}
						isPinned={option.entryId ? pinned.has(option.entryId) : false}
						onHover={onHover}
						onLeave={onLeave}
						onToggle={onToggle}
					/>
				))}
			</div>
		</section>
	);
}
