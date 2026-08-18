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

function rowStyle(offset: number, columnCount: number): React.CSSProperties {
	return {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		transform: `translateY(${offset}px)`,
		display: "grid",
		gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
		gap: GRID_GAP,
	};
}

// The row markup is deliberately duplicated in both grids instead of living in
// a shared child component: React Compiler bails out of memoizing components
// that call a virtualizer hook, but it would happily memoize a child that only
// receives the (stable) virtualizer instance, freezing the list on first paint.
function ElementScrollGrid({
	items,
	className,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
}: Omit<VirtualEntryGridProps, "scrollMode">) {
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
							style={rowStyle(virtualRow.start, columnCount)}
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

function WindowScrollGrid({
	items,
	className,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
}: Omit<VirtualEntryGridProps, "scrollMode">) {
	// React Compiler bails out of `useVirtualizer` on its own, but it doesn't
	// know `useWindowVirtualizer` has the same mutable-getter shape — memoizing
	// this component freezes the list at its first paint.
	"use no memo";

	const containerRef = useRef<HTMLDivElement>(null);
	const containerWidth = useContainerWidth(containerRef);
	const columnCount = getColumnCount(containerWidth);
	const rows = useMemo(() => chunk(items, columnCount), [items, columnCount]);

	// The grid starts partway down the document, so the window virtualizer needs
	// that document-relative offset to line up with the page scroll position.
	const [scrollMargin, setScrollMargin] = useState(0);

	// This grid stays mounted at desktop widths but is hidden by CSS, where its
	// rows measure as zero-height and keep re-notifying the virtualizer without
	// ever settling. A zero width is the signal that it isn't on screen.
	const isVisible = containerWidth > 0;

	useLayoutEffect(() => {
		const element = containerRef.current;
		if (!element || !isVisible) {
			return;
		}

		setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
	}, [containerWidth, isVisible, items]);

	const rowVirtualizer = useWindowVirtualizer({
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
							style={rowStyle(virtualRow.start - scrollMargin, columnCount)}
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
