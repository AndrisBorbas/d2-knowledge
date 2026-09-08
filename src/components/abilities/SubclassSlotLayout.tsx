"use client";

import type { Subclass } from "@/lib/compendium/subclasses";

import { AbilitySlotGrid } from "./AbilitySlotGrid";

type SubclassSlotLayoutProps = {
	subclass: Subclass;
	pinnedIds: string[];
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
};

// The game's own arrangement: super down the left, the four equipped slots in
// the middle, aspects on the right, fragments along the bottom - with every
// option shown instead of only the equipped one.
export function SubclassSlotLayout({
	subclass,
	pinnedIds,
	onHover,
	onLeave,
	onToggle,
}: SubclassSlotLayoutProps) {
	const slotById = new Map(subclass.slots.map((slot) => [slot.id, slot]));
	const slotProps = {
		elementSlug: subclass.elementSlug,
		classLabel: subclass.className,
		pinnedIds,
		onHover,
		onLeave,
		onToggle,
	};

	const transcendence = slotById.get("transcendence");
	const prismGrenade = slotById.get("prism_grenade");
	const supers = slotById.get("supers");
	const aspects = slotById.get("aspects");
	const fragments = slotById.get("fragments");
	const equipped = (
		["grenades", "melee", "class_abilities", "movement"] as const
	)
		.map((slotId) => slotById.get(slotId))
		.filter((slot) => slot !== undefined);

	return (
		<div className="flex flex-col gap-6">
			{/* Prismatic alone explains Transcendence above the slots, and gives
			    each class a grenade of its own while it is active. */}
			{transcendence || prismGrenade ? (
				<div className="grid gap-4 bg-white/5 p-3 backdrop-blur-md md:grid-cols-2">
					{transcendence ? (
						<AbilitySlotGrid slot={transcendence} layout="row" {...slotProps} />
					) : null}
					{prismGrenade ? (
						<AbilitySlotGrid slot={prismGrenade} layout="row" {...slotProps} />
					) : null}
				</div>
			) : null}

			<div className="grid gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
				<>{supers ? <AbilitySlotGrid slot={supers} {...slotProps} /> : null}</>
				<>
					{aspects ? <AbilitySlotGrid slot={aspects} {...slotProps} /> : null}
				</>
				<>
					{equipped.map((slot) => (
						<AbilitySlotGrid key={slot.id} slot={slot} {...slotProps} />
					))}
				</>
			</div>

			{fragments ? (
				<AbilitySlotGrid slot={fragments} {...slotProps} layout="row" />
			) : null}
		</div>
	);
}
