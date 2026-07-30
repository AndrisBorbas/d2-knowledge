"use client";

import { cn } from "@/lib/utils/utils";

type FilterHeaderProps = {
	searchInput: string;
	onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	hasActiveQuery: boolean;
	onClearSearch: () => void;
	filterBarGroups: string[];
	activeGroups: string[];
	onToggleGroup: (group: string) => void;
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
	clickedCount,
	onOpenMobileDrawer,
}: FilterHeaderProps) {
	return (
		<header className="border-b border-blue-500/50 backdrop-blur-md">
			<div className="">
				<div className="flex gap-3 p-2">
					<input
						id="compendium-search"
						type="search"
						value={searchInput}
						onChange={onSearchChange}
						placeholder="Search by title, description, item hash, or perk hash"
						className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/65 focus:border-sky-300/60 focus:outline-none"
					/>
					{hasActiveQuery ? (
						<button
							type="button"
							onClick={onClearSearch}
							className="borderHover bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
						>
							Clear
						</button>
					) : null}
				</div>
				<div className="m-2 ml-3 flex flex-row items-center gap-4">
					<p className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
						Filter:
					</p>
					<div
						className="flex flex-wrap gap-2"
						role="group"
						aria-label="Filter entries"
					>
						{filterBarGroups.map((group) => {
							const isActive = activeGroups.includes(group);

							return (
								<button
									key={group}
									type="button"
									onClick={() => onToggleGroup(group)}
									aria-pressed={isActive}
									className={cn(
										"borderHover px-3 py-1.5 text-xs font-semibold tracking-[0.08em] uppercase transition",
										isActive
											? "borderActive bg-blue-500/30 text-sky-100"
											: "bg-blue-500/10 text-white/68 hover:bg-blue-500/20",
									)}
								>
									{group}
								</button>
							);
						})}
					</div>
				</div>
				<div className="mt-4 lg:hidden">
					<button
						type="button"
						onClick={onOpenMobileDrawer}
						className="rounded-xl border border-white/16 bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
					>
						Open clicked tooltips ({clickedCount})
					</button>
				</div>
			</div>
		</header>
	);
}
