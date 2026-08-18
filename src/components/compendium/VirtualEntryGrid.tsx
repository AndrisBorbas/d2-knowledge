"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

import { Tooltip } from "../tooltip/Tooltip";

type KeywordHoverPayload = {
	keywordId: string;
	entryId: string;
	anchorRect: DOMRect;
	entryRect: DOMRect;
};

type KeywordClickPayload = {
	keywordId: string;
	entryId: string;
};

type VirtualEntryGridProps = {
	items: AnnotatedEntry[];
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: KeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: KeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
	className?: string;
};

const MIN_ITEM_WIDTH = 360;
const MAX_ITEM_WIDTH = 520;
const GRID_GAP = 16;
const ESTIMATED_ROW_HEIGHT = 240;
const OVERSCAN_ROWS = 4;

function getColumnCount(containerWidth: number) {
	if (containerWidth <= 0) {
		return 1;
	}

	let count = Math.max(
		1,
		Math.floor((containerWidth + GRID_GAP) / (MIN_ITEM_WIDTH + GRID_GAP)),
	);

	// Floor-by-min can leave a column wider than MAX_ITEM_WIDTH when the
	// container isn't an exact multiple of the min width; add columns until
	// each one fits back under the cap.
	while (
		count > 1 &&
		(containerWidth - (count - 1) * GRID_GAP) / count > MAX_ITEM_WIDTH
	) {
		count += 1;
	}

	return count;
}

function chunk<T>(items: T[], size: number): T[][] {
	if (size <= 1) {
		return items.map((item) => [item]);
	}

	const rows: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		rows.push(items.slice(index, index + size));
	}

	return rows;
}

function useContainerWidth(elementRef: React.RefObject<HTMLDivElement | null>) {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) {
			return;
		}

		setWidth(element.clientWidth);

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				setWidth(entry.contentRect.width);
			}
		});
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [elementRef]);

	return width;
}

export function VirtualEntryGrid({
	items,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
	className,
}: VirtualEntryGridProps) {
	const scrollElementRef = useRef<HTMLDivElement>(null);
	const containerWidth = useContainerWidth(scrollElementRef);
	const columnCount = getColumnCount(containerWidth);
	const rows = useMemo(() => chunk(items, columnCount), [items, columnCount]);

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollElementRef.current,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		overscan: OVERSCAN_ROWS,
	});

	return (
		<div
			ref={scrollElementRef}
			className={cn("h-full overflow-y-auto", className)}
		>
			<div
				style={{
					position: "relative",
					height: rowVirtualizer.getTotalSize(),
					width: "100%",
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const row = rows[virtualRow.index];
					if (!row) {
						return null;
					}

					return (
						<div
							key={virtualRow.key}
							data-index={virtualRow.index}
							ref={rowVirtualizer.measureElement}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${virtualRow.start}px)`,
								display: "grid",
								gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
								gap: GRID_GAP,
							}}
							className="p-4"
						>
							{row.map((entry) => (
								<Tooltip
									key={entry.id}
									entry={entry}
									entryMap={entryMap}
									keywordMap={keywordMap}
									onKeywordHover={onKeywordHover}
									onKeywordLeave={onKeywordLeave}
									onKeywordClick={onKeywordClick}
									onGroupClick={onGroupClick}
									showPinButton={true}
								/>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
