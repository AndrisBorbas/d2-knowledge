"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo, useState } from "react";

import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { Tooltip } from "@/components/tooltip/Tooltip";
import type { Artifact } from "@/lib/compendium/artifacts";
import { buildBundleMaps, type TooltipBundle } from "@/lib/compendium/bundle";

import { ArtifactBackdrop } from "./ArtifactBackdrop";
import { ArtifactPerkGrid } from "./ArtifactPerkGrid";
import { ArtifactShowcase } from "./ArtifactShowcase";

type ArtifactExplorerProps = {
	artifacts: Artifact[];
	bundle: TooltipBundle;
};

export function ArtifactExplorer({ artifacts, bundle }: ArtifactExplorerProps) {
	const [slug, setSlug] = useQueryState(
		"a",
		parseAsString.withDefault(artifacts[0].slug).withOptions({
			history: "push",
		}),
	);
	const [pinnedIds, setPinnedIds] = useState<string[]>([]);
	const router = useRouter();

	// This page has no group filter of its own, so a group chip hands off to the
	// glossary's `?g=` filter.
	const handleGroupClick = (group: string) => {
		router.push(`/glossary?g=${encodeURIComponent(group)}`);
	};

	const selected =
		artifacts.find((artifact) => artifact.slug === slug) ?? artifacts[0];

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
		showEntryPreview,
		handleKeywordHover,
		handleKeywordLeave,
	} = useHoverPreview({ keywordMap, entryMap });

	const togglePinned = (entryId: string) => {
		setPinnedIds((current) =>
			current.includes(entryId)
				? current.filter((id) => id !== entryId)
				: [entryId, ...current],
		);
	};

	// A keyword inside a tooltip pins the entry it points at, not its host.
	const handleKeywordClick = ({
		keywordId,
		entryId,
	}: {
		keywordId: string;
		entryId: string;
	}) => {
		const referencedEntryId = keywordMap
			.get(keywordId)
			?.references.find((candidateId) => entryMap.has(candidateId));
		togglePinned(referencedEntryId ?? entryId);
	};

	const pinnedEntries = pinnedIds
		.map((id) => entryMap.get(id))
		.filter((entry) => entry !== undefined);

	return (
		<div className="flex w-full flex-col gap-6 p-4 md:px-6 lg:px-8">
			<ArtifactBackdrop artifact={selected} />

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
				<div className="order-2 flex flex-col gap-4 lg:order-1">
					<div className="">
						<div className="flex items-center gap-3">
							{selected.iconPath ? (
								<div className="relative border border-white/20 bg-black/50">
									<Image
										src={selected.iconPath}
										alt=""
										width={96}
										height={96}
										className="size-24 object-cover"
									/>
								</div>
							) : null}
							<div>
								<h1 className="text-3xl font-black text-white uppercase lg:text-6xl">
									{selected.name}
								</h1>
								{selected.releaseLabel ? (
									<p className="text-base tracking-[0.2em] text-white/50 uppercase">
										{selected.releaseLabel}
									</p>
								) : null}
							</div>
						</div>
					</div>

					<ArtifactPerkGrid
						artifact={selected}
						pinnedIds={pinnedIds}
						onHover={showEntryPreview}
						onLeave={handleKeywordLeave}
						onToggle={togglePinned}
					/>

					{pinnedEntries.length > 0 ? (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<p className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
									Pinned ({pinnedEntries.length})
								</p>
								<button
									type="button"
									onClick={() => setPinnedIds([])}
									className="borderHover bg-white/8 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
								>
									Clear
								</button>
							</div>
							<div className="3xl:grid-cols-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
								{pinnedEntries.map((entry) => (
									<Tooltip
										key={entry.id}
										entry={entry}
										entryMap={entryMap}
										keywordMap={keywordMap}
										onKeywordHover={handleKeywordHover}
										onKeywordLeave={handleKeywordLeave}
										onKeywordClick={handleKeywordClick}
										onGroupClick={handleGroupClick}
									/>
								))}
							</div>
						</div>
					) : (
						<p className="text-xs text-white/45">
							Hover a perk for its tooltip, click to pin it here.
						</p>
					)}
				</div>

				<div className="order-1 lg:order-2">
					<ArtifactShowcase
						artifacts={artifacts}
						selected={selected}
						onSelect={(nextSlug) => void setSlug(nextSlug)}
					/>
				</div>
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
				onGroupClick={handleGroupClick}
			/>
		</div>
	);
}
