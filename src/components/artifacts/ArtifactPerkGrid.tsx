"use client";

import Image from "next/image";

import type { Artifact } from "@/lib/compendium/artifacts";
import type { AnnotatedEntry } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

type ArtifactPerkGridProps = {
	artifact: Artifact;
	pinnedIds: string[];
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
};

// The in-game panel marks each unlock row with a diamond count.
function slotMarker(index: number) {
	return "◆".repeat(index + 1);
}

function PerkButton({
	entry,
	isPinned,
	onHover,
	onLeave,
	onToggle,
}: {
	entry: AnnotatedEntry;
	isPinned: boolean;
	onHover: (entryId: string, anchorRect: DOMRect) => void;
	onLeave: () => void;
	onToggle: (entryId: string) => void;
}) {
	return (
		<button
			type="button"
			title={entry.title}
			aria-label={entry.title}
			aria-pressed={isPinned}
			onMouseEnter={(event) =>
				onHover(entry.id, event.currentTarget.getBoundingClientRect())
			}
			onFocus={(event) =>
				onHover(entry.id, event.currentTarget.getBoundingClientRect())
			}
			onMouseLeave={onLeave}
			onBlur={onLeave}
			onClick={() => onToggle(entry.id)}
			className={cn(
				"borderHover block shrink-0 bg-blue-950/40 transition after:border-t-0 hover:after:border-t",
				isPinned ? "borderActive bg-blue-500/30" : "hover:bg-blue-500/20",
			)}
		>
			{entry.iconPath ? (
				<div className="relative rounded-sm border-2 border-blue-400 p-1">
					<Image
						src={entry.iconPath}
						alt=""
						width={64}
						height={64}
						className="size-16 object-cover"
					/>
				</div>
			) : (
				<span className="flex size-full items-center justify-center px-1 text-[10px] leading-tight text-white/60">
					{entry.title}
				</span>
			)}
		</button>
	);
}

export function ArtifactPerkGrid({
	artifact,
	pinnedIds,
	onHover,
	onLeave,
	onToggle,
}: ArtifactPerkGridProps) {
	const pinned = new Set(pinnedIds);

	return (
		<div className="flex flex-col gap-3 bg-blue-950/20 p-3 backdrop-blur-md">
			{artifact.groups.map((group, groupIndex) => (
				<div
					key={group.column}
					className="flex flex-col gap-2 border-t border-blue-600/40 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:gap-3"
				>
					<span
						className="text-masterwork w-10 shrink-0 text-xs tracking-widest"
						aria-label={`Slot group ${String(2 - groupIndex + 1)}`}
					>
						{slotMarker(2 - groupIndex)}
					</span>
					<div className="flex flex-wrap gap-2">
						{group.entries.map((entry) => (
							<PerkButton
								key={entry.id}
								entry={entry}
								isPinned={pinned.has(entry.id)}
								onHover={onHover}
								onLeave={onLeave}
								onToggle={onToggle}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
