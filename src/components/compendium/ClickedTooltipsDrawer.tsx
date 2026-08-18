"use client";

import { X } from "lucide-react";

import { Tooltip } from "@/components/tooltip/Tooltip";
import type {
	TooltipKeywordClickPayload,
	TooltipKeywordHoverPayload,
} from "@/components/tooltip/types";
import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

type ClickedTooltipsDrawerProps = {
	isOpen: boolean;
	onClose: () => void;
	clickedEntries: AnnotatedEntry[];
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: TooltipKeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
	onRemove: (entryId: string) => void;
};

export function ClickedTooltipsDrawer({
	isOpen,
	onClose,
	clickedEntries,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
	onRemove,
}: ClickedTooltipsDrawerProps) {
	return (
		<div
			className={cn(
				"fixed inset-0 z-50 lg:hidden",
				isOpen ? "pointer-events-auto" : "pointer-events-none",
			)}
			aria-hidden={!isOpen}
		>
			<div
				className={cn(
					"absolute inset-0 bg-black/60 transition-opacity",
					isOpen ? "opacity-100" : "opacity-0",
				)}
				onClick={onClose}
			/>
			<aside
				className={cn(
					"absolute top-0 right-0 h-full w-[min(88vw,26rem)] border-l border-white/14 bg-black/92 p-4 shadow-2xl shadow-black/60 transition-transform",
					isOpen ? "translate-x-0" : "translate-x-full",
				)}
			>
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
						Clicked Tooltips
					</p>
					<button
						type="button"
						onClick={onClose}
						className="border border-white/16 bg-white/8 p-1.5 text-white/75"
						aria-label="Close clicked tooltip drawer"
					>
						<X size={16} />
					</button>
				</div>

				{clickedEntries.length > 0 ? (
					<div className="mt-4 max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto pr-1">
						{clickedEntries.map((entry) => (
							<div key={`drawer-${entry.id}`} className="space-y-2">
								<div className="flex justify-end">
									<button
										type="button"
										onClick={() => onRemove(entry.id)}
										className="border border-white/12 bg-white/8 p-1.5 text-white/70 transition hover:bg-white/14"
										aria-label={`Remove ${entry.title}`}
									>
										<X size={14} />
									</button>
								</div>
								<Tooltip
									entry={entry}
									entryMap={entryMap}
									keywordMap={keywordMap}
									onKeywordHover={onKeywordHover}
									onKeywordLeave={onKeywordLeave}
									onKeywordClick={onKeywordClick}
									onGroupClick={onGroupClick}
								/>
							</div>
						))}
					</div>
				) : (
					<p className="mt-4 text-sm text-white/62">
						Tap highlighted keywords to collect them here.
					</p>
				)}
			</aside>
		</div>
	);
}
