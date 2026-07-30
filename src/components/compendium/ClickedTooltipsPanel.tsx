"use client";

import { X } from "lucide-react";

import { Tooltip } from "@/components/tooltip/Tooltip";
import type {
	TooltipKeywordClickPayload,
	TooltipKeywordHoverPayload,
} from "@/components/tooltip/types";
import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";

type ClickedTooltipsPanelProps = {
	clickedEntries: AnnotatedEntry[];
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: TooltipKeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
	onRemove: (entryId: string) => void;
	onClearAll: () => void;
};

export function ClickedTooltipsPanel({
	clickedEntries,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	onGroupClick,
	onRemove,
	onClearAll,
}: ClickedTooltipsPanelProps) {
	return (
		<div className="mt-2 flex flex-col">
			<div className="mx-2 flex items-center justify-between gap-2">
				<div>
					<p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
						Clicked Tooltips
					</p>
					<p className="mt-1 text-xs text-white/60">
						{clickedEntries.length} item
						{clickedEntries.length === 1 ? "" : "s"}
					</p>
				</div>
				{clickedEntries.length > 0 ? (
					<button
						type="button"
						onClick={onClearAll}
						className="borderHover bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-red-500 uppercase transition hover:bg-red-500/20"
					>
						Clear all
					</button>
				) : null}
			</div>

			{clickedEntries.length > 0 ? (
				<div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
					{clickedEntries.map((entry) => (
						<div key={entry.id} className="relative">
							<Tooltip
								entry={entry}
								entryMap={entryMap}
								keywordMap={keywordMap}
								onKeywordHover={onKeywordHover}
								onKeywordLeave={onKeywordLeave}
								onKeywordClick={onKeywordClick}
								onGroupClick={onGroupClick}
							/>
							<div className="flex justify-end">
								<button
									type="button"
									onClick={() => onRemove(entry.id)}
									className="borderHover absolute top-1 right-1 bg-red-500/15 p-1 text-white/70 transition hover:bg-red-500/30"
									aria-label={`Remove ${entry.title}`}
								>
									<X size={14} className="text-red-500" />
								</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="mt-4 text-sm leading-7 text-white/62">
					Click any highlighted keyword to pin its tooltip here.
				</p>
			)}
		</div>
	);
}
