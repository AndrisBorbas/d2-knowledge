"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { CategorizedGroups } from "@/lib/compendium/groups";

import { GroupFilterPopover } from "./GroupFilterPopover";

type FilterHeaderProps = {
	searchInput: string;
	onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	hasActiveQuery: boolean;
	onClearSearch: () => void;
	filterBarGroups: string[];
	activeGroups: string[];
	onToggleGroup: (group: string) => void;
	onClearGroups: () => void;
	groupCategories: CategorizedGroups[];
	groupResultCounts: Map<string, number>;
	resultCount: number;
	clickedCount: number;
	onOpenMobileDrawer: () => void;
};

export function FilterHeader({
	searchInput,
	onSearchChange,
	hasActiveQuery,
	onClearSearch,
	filterBarGroups,
	activeGroups,
	onToggleGroup,
	onClearGroups,
	groupCategories,
	groupResultCounts,
	resultCount,
	clickedCount,
	onOpenMobileDrawer,
}: FilterHeaderProps) {
	// Active filters lead, so the current selection is always the first thing in
	// the strip even when the suggestions overflow off the right edge.
	const stripGroups = [
		...activeGroups,
		...filterBarGroups.filter((group) => !activeGroups.includes(group)),
	];

	return (
		<header className="border-b border-blue-500/50 backdrop-blur-md">
			<div className="flex gap-3 p-2">
				<input
					id="compendium-search"
					type="search"
					value={searchInput}
					onChange={onSearchChange}
					placeholder="Search by title, description, item, or hash..."
					className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/65 focus:border-sky-300/60 focus:outline-none"
				/>
				{hasActiveQuery ? (
					<Button size="md" onClick={onClearSearch}>
						Clear
					</Button>
				) : null}
			</div>

			<div className="m-2 ml-3 flex flex-row items-center gap-2">
				<GroupFilterPopover
					groupCategories={groupCategories}
					groupResultCounts={groupResultCounts}
					activeGroups={activeGroups}
					onToggleGroup={onToggleGroup}
					onClearGroups={onClearGroups}
					resultCount={resultCount}
				/>

				<div
					// `-m-2 p-2` on the scrolling variant: overflow-x-auto clips
					// vertically as well, and the borderHover frame grows 6px past
					// each chip.
					className="-m-2 flex min-w-0 [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto p-2 [-ms-overflow-style:none] lg:m-0 lg:flex-wrap lg:overflow-x-visible lg:p-0 [&::-webkit-scrollbar]:hidden"
					role="group"
					aria-label="Filter entries"
				>
					{stripGroups.map((group) => {
						const isActive = activeGroups.includes(group);

						return (
							<Button
								key={group}
								variant="subtle"
								active={isActive}
								onClick={() => onToggleGroup(group)}
								aria-pressed={isActive}
								className="flex shrink-0 items-center gap-1 whitespace-nowrap"
							>
								<span>{group}</span>
								{isActive ? <X size={11} className="text-sky-100/80" /> : null}
							</Button>
						);
					})}
				</div>
			</div>

			<div className="mt-4 lg:hidden">
				<Button size="md" onClick={onOpenMobileDrawer}>
					Open clicked tooltips ({clickedCount})
				</Button>
			</div>
		</header>
	);
}
