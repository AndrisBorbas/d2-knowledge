"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils/utils";

export type SortDirection = "asc" | "desc";

export type TableColumn<T> = {
	key: string;
	label: string;
	// A sortable column returns the value to order by; a column with no
	// `sortValue` is display only.
	sortValue?: (row: T) => number | string;
	render: (row: T) => React.ReactNode;
	className?: string;
	align?: "left" | "right";
	// The cell runs down the detail strip as well, so an icon stands beside
	// both the row and the prose under it rather than only the row. Only the
	// first column can claim it, since that is the only side the strip can
	// start after.
	leading?: boolean;
};

type SortableTableProps<T> = {
	rows: T[];
	columns: TableColumn<T>[];
	rowKey: (row: T) => string;
	gridClass: string;
	initialSort?: { key: string; direction: SortDirection };
	emptyMessage?: string;
	// A full width strip under the row, for prose the grid has no honest width
	// for: the conditions behind a damage number run to a line and a half and
	// would otherwise be truncated into uselessness.
	renderDetail?: (row: T) => React.ReactNode;
};

const HEADER_CLASS =
	"text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase";

// Numbers sort numerically, everything else alphabetically, and a missing
// number always sinks so an empty cell never outranks a real one.
function compare(left: number | string, right: number | string) {
	if (typeof left === "number" && typeof right === "number") {
		if (Number.isNaN(left)) return 1;
		if (Number.isNaN(right)) return -1;
		return left - right;
	}
	return String(left).localeCompare(String(right));
}

export function SortableTable<T>({
	rows,
	columns,
	rowKey,
	gridClass,
	initialSort,
	emptyMessage = "Nothing matches those filters.",
	renderDetail,
}: SortableTableProps<T>) {
	const [sort, setSort] = useState<{ key: string; direction: SortDirection }>(
		initialSort ?? { key: columns[0].key, direction: "asc" },
	);

	const sorted = useMemo(() => {
		const column = columns.find((entry) => entry.key === sort.key);
		if (!column?.sortValue) return rows;
		const { sortValue } = column;

		return [...rows].sort((left, right) => {
			const result = compare(sortValue(left), sortValue(right));
			return sort.direction === "asc" ? result : -result;
		});
	}, [rows, columns, sort]);

	const toggleSort = (key: string) => {
		setSort((current) =>
			current.key === key
				? {
						key,
						direction: current.direction === "asc" ? "desc" : "asc",
					}
				: { key, direction: "desc" },
		);
	};

	// Every column is on screen at every width and the table scrolls sideways to
	// reach them, rather than a phone being given a different set of columns
	// than a desktop. `w-max` is what makes the rows themselves as wide as the
	// widest of them, so a row's border and hover reach the far end of that
	// scroll instead of stopping at the edge of the screen.
	return (
		<div className="overflow-x-auto border border-blue-500/40 bg-black/45 backdrop-blur-md">
			<div className="w-max min-w-full">
				<div className={cn(gridClass, "border-b border-blue-500/40 px-3 py-2")}>
					{columns.map((column) => {
						const isActive = sort.key === column.key;
						const Icon = sort.direction === "asc" ? ArrowUp : ArrowDown;

						if (!column.sortValue) {
							return (
								<span
									key={column.key}
									className={cn(
										HEADER_CLASS,
										column.align === "right" && "text-right",
									)}
								>
									{column.label}
								</span>
							);
						}

						return (
							<button
								key={column.key}
								type="button"
								onClick={() => {
									toggleSort(column.key);
								}}
								aria-label={`Sort by ${column.label}`}
								className={cn(
									HEADER_CLASS,
									"flex cursor-pointer items-center gap-1 transition hover:text-white",
									column.align === "right" && "justify-end",
									isActive && "text-sky-200",
								)}
							>
								{column.label}
								{isActive ? <Icon aria-hidden className="size-3" /> : null}
							</button>
						);
					})}
				</div>

				{sorted.length === 0 ? (
					<p className="px-3 py-8 text-center text-sm text-white/60">
						{emptyMessage}
					</p>
				) : (
					sorted.map((row) => {
						const detail = renderDetail?.(row);
						// The strip only moves inside the grid when there is a cell to
						// its left to clear; otherwise it stays the full width band it
						// is on every other tab.
						const inset = Boolean(detail) && columns[0].leading === true;

						return (
							<div
								key={rowKey(row)}
								className="border-b border-blue-500/15 transition last:border-b-0 hover:bg-blue-500/10"
							>
								<div
									className={cn(
										gridClass,
										"px-3 pt-2",
										detail ? "pb-1" : "pb-2",
										// The two rows of one record read as one line and a
										// note under it, which the column gap is too wide for.
										inset && "gap-y-1 pb-2",
									)}
								>
									{columns.map((column) => (
										<div
											key={column.key}
											className={cn(
												"min-w-0 truncate text-sm text-white/80",
												column.align === "right" && "text-right tabular-nums",
												column.leading && inset && "row-span-2",
												column.className,
											)}
										>
											{column.render(row)}
										</div>
									))}
									{inset ? (
										<div className="col-start-2 col-end-[-1] min-w-0">
											{detail}
										</div>
									) : null}
								</div>
								{detail && !inset ? (
									<div className="px-3 pb-2">{detail}</div>
								) : null}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
