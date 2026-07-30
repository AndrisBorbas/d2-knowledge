"use client";

import type { RefObject } from "react";

import { Tooltip } from "@/components/tooltip/Tooltip";
import type {
	TooltipKeywordClickPayload,
	TooltipKeywordHoverPayload,
} from "@/components/tooltip/types";
import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

import type { HoverPreviewState } from "./useHoverPreview";

type HoverPreviewCardProps = {
	hoveredEntry: AnnotatedEntry | null;
	hoverPreview: HoverPreviewState | null;
	hoverCardStyle: { left: number; top: number } | null;
	resolvedHoverTop: number | null;
	hoverCardRef: RefObject<HTMLDivElement | null>;
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: TooltipKeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
};

export function HoverPreviewCard({
	hoveredEntry,
	hoverPreview,
	hoverCardStyle,
	resolvedHoverTop,
	hoverCardRef,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
}: HoverPreviewCardProps) {
	if (!hoveredEntry || !hoverCardStyle) {
		return null;
	}

	return (
		<div
			ref={hoverCardRef}
			className={cn(
				"pointer-events-none fixed z-50 w-130 bg-gray-900/50 shadow-2xl shadow-black/50",
				hoverPreview?.placement === "left"
					? "-translate-x-full"
					: "translate-x-0",
			)}
			style={{
				left: hoverCardStyle.left,
				top: resolvedHoverTop ?? hoverCardStyle.top,
			}}
		>
			<Tooltip
				entry={hoveredEntry}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
				onGroupClick={onGroupClick}
			/>
		</div>
	);
}
