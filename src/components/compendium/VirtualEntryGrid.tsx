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
const COLUMN_HYSTERESIS = 32;

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

function widthForColumns(count: number) {
	return count * MIN_ITEM_WIDTH + (count - 1) * GRID_GAP;
}

// A container parked exactly on a column threshold would otherwise flip counts
// on every sub-pixel width change, and each flip changes row heights, which
// nudges the width again. Require a margin past the threshold before switching.
function resolveColumnCount(containerWidth: number, previousCount: number) {
	const target = getColumnCount(containerWidth);

	if (
		target > previousCount &&
		containerWidth < widthForColumns(target) + COLUMN_HYSTERESIS
	) {
		return previousCount;
	}

	if (
		target < previousCount &&
		containerWidth > widthForColumns(previousCount) - COLUMN_HYSTERESIS
	) {
		return previousCount;
	}

	return target;
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

function useColumnCount(elementRef: React.RefObject<HTMLDivElement | null>) {
	const [columnCount, setColumnCount] = useState(1);
	// The hysteresis is only meaningful once there is a real previous count to
	// stick to; the first measurement has to take the plain answer or a wide
	// container would be stranded on the placeholder single column.
	const hasMeasuredRef = useRef(false);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) {
			return;
		}

		// Sub-pixel widths would keep re-chunking the grid for no visible gain,
		// so quantise before the column math sees them.
		const apply = (width: number) => {
			const flooredWidth = Math.floor(width);
			if (flooredWidth <= 0) {
				// Hidden by a breakpoint; nothing to derive a column count from.
				return;
			}

			const hasMeasured = hasMeasuredRef.current;
			hasMeasuredRef.current = true;

			setColumnCount((previousCount) =>
				hasMeasured
					? resolveColumnCount(flooredWidth, previousCount)
					: getColumnCount(flooredWidth),
			);
		};

		apply(element.clientWidth);

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				apply(entry.contentRect.width);
			}
		});
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [elementRef]);

	return columnCount;
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
	const columnCount = useColumnCount(scrollElementRef);
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
			// A reserved gutter keeps the scrollbar from changing the width the
			// column count is derived from.
			className={cn(
				"h-full [scrollbar-gutter:stable] overflow-y-auto",
				className,
			)}
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
