"use client";

import * as Popover from "@radix-ui/react-popover";
import { ListFilter, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, CloseButton } from "@/components/ui/Button";
import type { CategorizedGroups } from "@/lib/compendium/groups";
import { cn } from "@/lib/utils/utils";

type GroupFilterPopoverProps = {
	groupCategories: CategorizedGroups[];
	groupResultCounts: Map<string, number>;
	activeGroups: string[];
	onToggleGroup: (group: string) => void;
	onClearGroups: () => void;
	resultCount: number;
};

const DESKTOP_QUERY = "(min-width: 1024px)";

function normalize(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function GroupFilterPopover({
	groupCategories,
	groupResultCounts,
	activeGroups,
	onToggleGroup,
	onClearGroups,
	resultCount,
}: GroupFilterPopoverProps) {
	// Radix unmounts the content when closed, so this resets between visits.
	const [filterQuery, setFilterQuery] = useState("");

	const normalizedQuery = normalize(filterQuery);
	const visibleCategories = useMemo(() => {
		if (normalizedQuery.length === 0) {
			return groupCategories;
		}

		return groupCategories
			.map((category) => ({
				...category,
				groups: category.groups.filter((group) =>
					normalize(group).includes(normalizedQuery),
				),
			}))
			.filter((category) => category.groups.length > 0);
	}, [groupCategories, normalizedQuery]);

	const hasActiveGroups = activeGroups.length > 0;

	return (
		<Popover.Root onOpenChange={() => setFilterQuery("")}>
			<Popover.Trigger asChild>
				<Button
					variant="subtle"
					active={hasActiveGroups}
					className="flex shrink-0 items-center gap-1.5"
				>
					<ListFilter size={13} />
					<span>Filters</span>
					{hasActiveGroups ? (
						<span className="tabular-nums">({activeGroups.length})</span>
					) : null}
				</Button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={6}
					collisionPadding={8}
					aria-label="All filters"
					onOpenAutoFocus={(event) => {
						// On a phone, focusing the field raises the keyboard over the very
						// list the reader just opened.
						if (!window.matchMedia(DESKTOP_QUERY).matches) {
							event.preventDefault();
						}
					}}
					className="z-50 flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(52rem,calc(100vw-1rem))] flex-col border border-blue-500/50 bg-blue-950/20 shadow-2xl shadow-black/60 backdrop-blur-md"
				>
					<div className="flex shrink-0 items-center gap-2 border-b border-white/10 p-2">
						<div className="relative flex-1">
							<Search
								size={14}
								className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/45"
							/>
							<input
								type="search"
								value={filterQuery}
								onChange={(event) => setFilterQuery(event.target.value)}
								placeholder="Find a filter..."
								className="w-full border border-blue-500/50 bg-blue-950/60 py-2 pr-3 pl-8 text-sm text-white placeholder:text-white/55 focus:border-sky-300/60 focus:outline-none"
							/>
						</div>
						{hasActiveGroups ? (
							<Button
								size="xs"
								onClick={onClearGroups}
								className="shrink-0 py-2"
							>
								Clear all
							</Button>
						) : null}
						<Popover.Close asChild>
							<CloseButton label="Close filter list" className="shrink-0" />
						</Popover.Close>
					</div>

					<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
						{visibleCategories.length === 0 ? (
							<p className="py-6 text-center text-sm text-white/55">
								No filter matches &quot;{filterQuery}&quot;.
							</p>
						) : (
							visibleCategories.map((category) => (
								<section key={category.id} className="space-y-2">
									<p className="text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
										{category.label}
									</p>
									<div className="flex flex-wrap gap-2.5">
										{category.groups.map((group) => {
											const isActive = activeGroups.includes(group);
											const count = groupResultCounts.get(group) ?? 0;
											// An inactive group with no overlap would empty the list,
											// so it stays visible but unpickable.
											const isDeadEnd = !isActive && count === 0;

											return (
												<Button
													key={group}
													variant="subtle"
													size="chip"
													active={isActive}
													disabled={isDeadEnd}
													onClick={() => onToggleGroup(group)}
													aria-pressed={isActive}
													className="flex items-center gap-1.5"
												>
													<span>{group}</span>
													<span
														className={cn(
															"text-[10px] font-normal tabular-nums",
															isActive ? "text-sky-100/70" : "text-white/40",
														)}
													>
														{count}
													</span>
													{isActive ? (
														<X size={11} className="text-sky-100/80" />
													) : null}
												</Button>
											);
										})}
									</div>
								</section>
							))
						)}
					</div>

					<div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 p-2">
						<p className="text-xs text-white/55">
							{hasActiveGroups
								? `${activeGroups.length} filter${activeGroups.length === 1 ? "" : "s"} active`
								: "No filters active"}
						</p>
						<Popover.Close asChild>
							<Button variant="primary" size="md">
								Show {resultCount} result{resultCount === 1 ? "" : "s"}
							</Button>
						</Popover.Close>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
