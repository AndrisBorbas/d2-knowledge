"use client";

import { useRef } from "react";

import { IconSlot, TooltipBody } from "./TooltipContent";
import type {
	KeywordClickPayload,
	KeywordHoverPayload,
	TooltipProps,
} from "./types";

export function Tooltip({
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
}: TooltipProps) {
	const articleRef = useRef<HTMLElement>(null);

	const handleKeywordHover = (payload: KeywordHoverPayload) => {
		onKeywordHover?.({
			keywordId: payload.keywordId,
			anchorRect: payload.anchorRect,
			entryId: entry.id,
			entryRect:
				articleRef.current?.getBoundingClientRect() ?? payload.anchorRect,
		});
	};

	const handleKeywordClick = (payload: KeywordClickPayload) => {
		onKeywordClick?.({
			keywordId: payload.keywordId,
			entryId: entry.id,
		});
	};

	return (
		<article
			key={entry.id}
			ref={articleRef}
			className="borderHover h-fit bg-blue-950/10 backdrop-blur-md"
		>
			<div className="grid grid-cols-[66px_1fr] items-center justify-start gap-4 border-b border-blue-600/50 bg-blue-950/30">
				<div className="bg-blue-950/50 p-2">
					<IconSlot
						iconPath={entry.iconPath}
						label={entry.title}
						border={entry.iconBorder}
					/>
				</div>
				<h3 className="text-xl font-semibold text-white">{entry.title}</h3>
			</div>

			<div className="mx-2 mt-2 flex flex-wrap gap-2">
				{entry.groups.map((group) => (
					<button
						key={group}
						type="button"
						onClick={() => onGroupClick?.(group)}
						className="borderHover inline-block bg-blue-950/20 px-3 py-1 text-xs text-white/60 transition hover:bg-blue-950/40"
					>
						{group}
					</button>
				))}
			</div>

			{entry.extraInfo && !entry.extraInfo.startsWith("Item: ") ? (
				<p className="m-2 mb-0 border-t border-gray-500 bg-blue-950/15 px-2 py-2 text-center leading-none font-bold whitespace-pre-wrap shadow-md shadow-blue-950/15">
					{entry.extraInfo}
					{entry.secondaryDetail ? (
						<span className="text-foreground/70 mt-1 block text-xs">
							{entry.secondaryDetail}
						</span>
					) : null}
				</p>
			) : null}

			<TooltipBody
				entry={entry}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={handleKeywordClick}
			/>
		</article>
	);
}
