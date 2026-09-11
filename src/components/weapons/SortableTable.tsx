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
	// Hidden below md, for columns a phone has no room for.
	secondary?: boolean;
};

type SortableTableProps<T> = {
	rows: T[];
	columns: TableColumn<T>[];
	rowKey: (row: T) => string;
	gridClass: string;
	initialSort?: { key: string; direction: SortDirection };
	emptyMessage?: string;
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

	return (
		<div className="overflow-x-auto border border-blue-500/40 bg-black/45 backdrop-blur-md">
			<div className="min-w-full">
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
										column.secondary && "hidden md:block",
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
									column.secondary && "hidden md:flex",
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
					sorted.map((row) => (
						<div
							key={rowKey(row)}
							className={cn(
								gridClass,
								"border-b border-blue-500/15 px-3 py-2 transition last:border-b-0 hover:bg-blue-500/10",
							)}
						>
							{columns.map((column) => (
								<span
									key={column.key}
									className={cn(
										"min-w-0 truncate text-sm text-white/80",
										column.align === "right" && "text-right tabular-nums",
										column.secondary && "hidden md:block",
										column.className,
									)}
								>
									{column.render(row)}
								</span>
							))}
						</div>
					))
				)}
			</div>
		</div>
	);
}
