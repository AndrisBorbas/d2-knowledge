"use client";

import { Tooltip } from "@/components/tooltip/Tooltip";
import type {
	TooltipKeywordClickPayload,
	TooltipKeywordHoverPayload,
} from "@/components/tooltip/types";
import { Button, UnpinButton } from "@/components/ui/Button";
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
	// The subclass pages pin abilities by clicking their icon, not only by
	// clicking a keyword, so they name the panel after that.
	title?: string;
	emptyMessage?: string;
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
	title = "Clicked Tooltips",
	emptyMessage = "Click any highlighted keyword to pin its tooltip here.",
}: ClickedTooltipsPanelProps) {
	return (
		<div className="@container mt-2 flex flex-col">
			<div className="mx-2 flex items-center justify-between gap-2">
				<div>
					<p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
						{title}
					</p>
					<p className="mt-1 text-xs text-white/60">
						{clickedEntries.length} item
						{clickedEntries.length === 1 ? "" : "s"}
					</p>
				</div>
				{clickedEntries.length > 0 ? (
					<Button variant="danger" size="xs" onClick={onClearAll}>
						Clear all
					</Button>
				) : null}
			</div>

			{clickedEntries.length > 0 ? (
				<div className="mt-4 grid min-h-0 grid-cols-1 gap-4 space-y-3 overflow-y-auto p-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
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
								<UnpinButton
									onClick={() => onRemove(entry.id)}
									className="absolute top-1 right-1"
									label={`Unpin ${entry.title}`}
								/>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="mt-4 text-sm leading-7 text-white/62">{emptyMessage}</p>
			)}
		</div>
	);
}
