"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { buildBundleMaps, type TooltipBundle } from "@/lib/compendium/bundle";

const VISIBLE_COUNT = 4;

type HighlightsShowcaseProps = {
	bundle: TooltipBundle;
};

export function HighlightsShowcase({ bundle }: HighlightsShowcaseProps) {
	const router = useRouter();
	const [offset, setOffset] = useState(0);

	const { entryMap, keywordMap } = useMemo(
		() => buildBundleMaps(bundle),
		[bundle],
	);

	const {
		hoverPreview,
		hoverCardRef,
		resolvedHoverTop,
		hoverCardStyle,
		hoveredEntry,
		handleKeywordHover,
		handleKeywordLeave,
	} = useHoverPreview({ keywordMap, entryMap });

	// The server sends a pool; the button walks a window through it so a reshuffle
	// costs nothing.
	const pool = bundle.entries;
	const visible = Array.from({ length: Math.min(VISIBLE_COUNT, pool.length) })
		.map((_, index) => pool[(offset + index) % pool.length])
		.filter((entry) => entry !== undefined);

	const handleKeywordClick = ({ keywordId }: { keywordId: string }) => {
		const label = keywordMap.get(keywordId)?.label;
		if (!label) return;
		router.push(`/glossary?q=${encodeURIComponent(label)}`);
	};

	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
					Random entries
				</h2>
				<button
					type="button"
					onClick={() => setOffset((current) => current + VISIBLE_COUNT)}
					className="borderHover bg-white/8 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
				>
					Shuffle
				</button>
			</div>

			<div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{visible.map((entry) => (
					<Tooltip
						key={entry.id}
						entry={entry}
						entryMap={entryMap}
						keywordMap={keywordMap}
						onKeywordHover={handleKeywordHover}
						onKeywordLeave={handleKeywordLeave}
						onKeywordClick={handleKeywordClick}
						onGroupClick={(group) => {
							router.push(`/glossary?g=${encodeURIComponent(group)}`);
						}}
					/>
				))}
			</div>

			<HoverPreviewCard
				hoveredEntry={hoveredEntry}
				hoverPreview={hoverPreview}
				hoverCardStyle={hoverCardStyle}
				resolvedHoverTop={resolvedHoverTop}
				hoverCardRef={hoverCardRef}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={handleKeywordLeave}
				onKeywordClick={handleKeywordClick}
				onGroupClick={(group) => {
					router.push(`/glossary?g=${encodeURIComponent(group)}`);
				}}
			/>
		</section>
	);
}
