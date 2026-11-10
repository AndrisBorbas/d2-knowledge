"use client";

import Image from "next/image";

import type { AnnotatedEntry } from "@/lib/compendium/model";
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

function CountBadge({ count }: { count: number }) {
	if (count < 2) return null;

	return (
		<span
			className="bg-masterwork absolute -right-1 -bottom-1 z-10 px-1 text-xs font-bold text-black"
			title={`${String(count)} copies in this build`}
		>
			×{count}
		</span>
	);
}

// One entry as an icon. The name is on the hover card and in the accessible
// label, so a build reads as a grid of icons, not a wall of text.
export function EntryIconButton({
	entry,
	count = 1,
	handlers,
}: {
	entry: AnnotatedEntry;
	count?: number;
	handlers: IconHandlers;
}) {
	const isPinned = handlers.pinnedIds.has(entry.id);

	return (
		<button
			type="button"
			title={entry.title}
			aria-label={entry.title}
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
				"borderHover relative block shrink-0 bg-blue-950/40 transition after:border-t-0 hover:after:border-t",
				isPinned
					? "borderActive bg-blue-500/30 after:border-t"
					: "hover:bg-blue-500/20",
			)}
		>
			{entry.iconPath ? (
				<div className="relative rounded-sm border-2 border-blue-400 p-1">
					<Image
						src={entry.iconPath}
						alt=""
						width={64}
						height={64}
						className="size-14 object-cover sm:size-16"
					/>
				</div>
			) : (
				// Not every entry has an icon; its name is all there is to show.
				<span className="flex size-[4.5rem] items-center justify-center px-1 text-center text-[10px] leading-tight text-white/70 sm:size-20">
					{entry.title}
				</span>
			)}
			<CountBadge count={count} />
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
						width={64}
						height={64}
						className="size-14 object-cover sm:size-16"
					/>
				</div>
			) : (
				<div className="flex size-14 items-center justify-center border border-dashed border-white/20 bg-black/30 text-xs text-white/45 sm:size-16">
					?
				</div>
			)}
			<div>
				<h3 className="text-xl font-semibold text-white">
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
