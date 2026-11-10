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

const DEFAULT_ICON_BORDER_CLASS = "border-white/20";

// One entry as a small button: its icon and name, in the style of the
// subclass pages' option buttons but without the room they give each one. The
// full description is on the hover card and in the pinned panel.
export function EntryIconButton({
	entry,
	count = 1,
	borderClass = DEFAULT_ICON_BORDER_CLASS,
	handlers,
}: {
	entry: AnnotatedEntry;
	count?: number;
	// The icon's frame, which a subclass plug takes from its element.
	borderClass?: string;
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
				"borderHover flex min-w-0 items-center gap-2 bg-white/5 p-1.5 pr-2.5 text-left backdrop-blur-sm transition hover:after:border-t",
				isPinned
					? "borderActive bg-white/20 after:border-t"
					: "hover:bg-white/12",
			)}
		>
			{entry.iconPath ? (
				<Image
					src={entry.iconPath}
					alt=""
					width={32}
					height={32}
					className={cn("size-8 shrink-0 border object-cover", borderClass)}
				/>
			) : (
				<span className="size-8 shrink-0 border border-dashed border-white/20" />
			)}
			<span className="max-w-44 truncate text-sm font-semibold text-white/90">
				{entry.title}
			</span>
			{count > 1 ? (
				<span className="text-masterwork text-xs font-bold">×{count}</span>
			) : null}
		</button>
	);
}

export function IconRow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-1.5">{children}</div>;
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
