"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { buildBundleMaps, type TooltipBundle } from "@/lib/compendium/bundle";

const VISIBLE_COUNT = 4;

// Picked once per page load. The page is prerendered, so the starting window has
// to be chosen on the client; `useSyncExternalStore` is how you read a
// client-only value without tripping a hydration mismatch.
const SESSION_OFFSET = Math.floor(Math.random() * 0x7fffffff);
const subscribeToNothing = () => () => {};

type HighlightsShowcaseProps = {
	bundle: TooltipBundle;
};

export function HighlightsShowcase({ bundle }: HighlightsShowcaseProps) {
	const router = useRouter();
	// 0 during the prerender and the hydrating render, the session offset after.
	const sessionOffset = useSyncExternalStore(
		subscribeToNothing,
		() => SESSION_OFFSET,
		() => 0,
	);
	const [shuffleCount, setShuffleCount] = useState(0);

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

	// The build sends a pool; the button walks a window through it so a reshuffle
	// costs nothing.
	const pool = bundle.entries;
	const offset = sessionOffset + shuffleCount * VISIBLE_COUNT;
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
				<h3 className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
					Random entries
				</h3>
				<button
					type="button"
					onClick={() => setShuffleCount((current) => current + 1)}
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
