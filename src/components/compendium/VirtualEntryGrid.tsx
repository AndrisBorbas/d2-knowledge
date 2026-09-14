"use client";

import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

type EntryCallbacks = {
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: KeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: KeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
};

type VirtualEntryGridProps = EntryCallbacks & {
	items: AnnotatedEntry[];
	// "element" keeps the list in its own scroll container (desktop panels),
	// "window" lets the page scroll so anything above can scroll out of view.
	scrollMode?: "element" | "window";
	className?: string;
};

type GridProps = Omit<VirtualEntryGridProps, "scrollMode">;

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

function useGridMetrics(elementRef: React.RefObject<HTMLDivElement | null>) {
	const [columnCount, setColumnCount] = useState(1);
	const [isVisible, setIsVisible] = useState(false);
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
			setIsVisible(flooredWidth > 0);

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

	return { columnCount, isVisible };
}

// The row markup below is deliberately duplicated in both grids instead of
// living in a shared child component: React Compiler skips memoizing components
// that call a virtualizer hook, but it would happily memoize a child that only
// receives the (stable) virtualizer instance, freezing the list on first paint.
function ElementScrollGrid({
	items,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
	className,
}: GridProps) {
	const scrollElementRef = useRef<HTMLDivElement>(null);
	const { columnCount } = useGridMetrics(scrollElementRef);
	const rows = useMemo(() => chunk(items, columnCount), [items, columnCount]);

	// eslint-disable-next-line react-hooks/incompatible-library
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
				"h-full scrollbar-gutter-stable overflow-y-auto",
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

// React Compiler bails out of `useVirtualizer` on its own, but it doesn't know
// `useWindowVirtualizer` has the same shape: every value here comes off one
// mutable instance that never changes identity, so the compiler caches the
// first answer it gets and keeps it. `getTotalSize()` is the one that hurts -
// cached at the zero it returns before the grid has been measured, the box the
// rows are drawn in has no height and the footer lands on top of them.
//
// The directive has to be the first statement in the body and unparenthesised,
// or it is an ordinary expression and the compiler never sees it.
function WindowScrollGrid({
	items,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
	className,
}: GridProps) {
	"use no memo";

	const containerRef = useRef<HTMLDivElement>(null);
	const { columnCount, isVisible } = useGridMetrics(containerRef);
	const rows = useMemo(() => chunk(items, columnCount), [items, columnCount]);

	// The grid starts partway down the document, so the window virtualizer needs
	// that document-relative offset to line up with the page scroll position.
	// An offset that no longer matches leaves it drawing the rows for a scroll
	// position other than the one on screen, which reads as a blank stretch of
	// page with the footer sitting in it.
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const element = containerRef.current;
		if (!element || !isVisible) {
			return;
		}

		const measure = () => {
			const next = element.getBoundingClientRect().top + window.scrollY;
			// Sub-pixel drift is not worth a render, and bailing out on it is what
			// keeps the observers below from feeding themselves.
			setScrollMargin((current) =>
				Math.abs(next - current) < 1 ? current : next,
			);
		};

		measure();

		// What sits above the grid can change height without this component
		// rendering at all - the mobile nav menu opening inside the sticky
		// header is the loud one, at up to 30rem of it, and it animates for
		// 300ms on top of that - so a render of the grid is not a signal that
		// the grid moved. `body` is what grows with the page; `html` is pinned
		// to the viewport and would never report it.
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		observer.observe(document.body);
		window.addEventListener("resize", measure);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [columnCount, isVisible, items]);

	const rowVirtualizer = useWindowVirtualizer({
		// This grid stays mounted at desktop widths but is hidden by CSS, where
		// its rows measure as zero-height and keep re-notifying the virtualizer
		// without ever settling.
		count: isVisible ? rows.length : 0,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		overscan: OVERSCAN_ROWS,
		scrollMargin,
		// Row measurement happens from a ref callback during commit, and the
		// virtualizer's default sync notify would `flushSync` from there.
		useFlushSync: false,
	});

	return (
		<div ref={containerRef} className={className}>
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
								transform: `translateY(${virtualRow.start - scrollMargin}px)`,
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

export function VirtualEntryGrid({
	scrollMode = "element",
	...props
}: VirtualEntryGridProps) {
	if (scrollMode === "window") {
		return <WindowScrollGrid {...props} />;
	}

	return <ElementScrollGrid {...props} />;
}
