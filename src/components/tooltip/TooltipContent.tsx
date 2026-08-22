"use client";

import Image from "next/image";

import {
	type AttributionSource,
	getAttributionSource,
	getSourceAttribution,
} from "@/lib/compendium/attribution";
import {
	type DescriptionBlock,
	getDescriptionBlocks,
} from "@/lib/compendium/descriptions";
import type { Annotation, IconGlyph } from "@/lib/compendium/model";
import {
	type DescriptionSourceToggle,
	useSettingsStore,
} from "@/lib/site/settingsStore";
import { cn } from "@/lib/utils/utils";

import { TextWithTooltips } from "./TextWithTooltips";
import type { TooltipContentProps } from "./types";

export function IconSlot({
	iconPath,
	label,
	border,
}: {
	iconPath?: string;
	label: string;
	border?: "masterwork";
}) {
	if (iconPath) {
		return (
			<div
				className={cn(
					"relative border bg-black/50",
					border === "masterwork"
						? "border-masterwork shadow-[0_0_6px_var(--color-masterwork)]"
						: "border-white/20",
				)}
			>
				<Image
					src={iconPath}
					alt={label}
					width={48}
					height={48}
					className="size-12 object-cover"
				/>
			</div>
		);
	}

	return (
		<div className="border border-dashed border-white/20 bg-black/30 text-[10px] text-white/50">
			<div className="flex size-12 items-center justify-center">N/A</div>
		</div>
	);
}

function DescriptionText({
	text,
	annotations,
	iconGlyphs,
	className,
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps & {
	text: string;
	annotations: Annotation[];
	iconGlyphs?: IconGlyph[];
	className?: string;
}) {
	const align = useSettingsStore((state) => state.tooltipAlign);

	return (
		<p
			className={cn(
				"p-4 text-sm whitespace-pre-wrap text-white/90",
				align === "left" ? "text-left" : "text-center",
				className,
			)}
		>
			<TextWithTooltips
				text={text}
				annotations={annotations}
				iconGlyphs={iconGlyphs}
				entry={entry}
				entryMap={entryMap}
				keywordById={keywordMap}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
			/>
		</p>
	);
}

function SourceAttribution({
	sources,
	variantLabel,
}: {
	sources: AttributionSource[];
	variantLabel?: string;
}) {
	return (
		<p className="border-y border-t-gray-500 border-b-blue-600/50 px-4 py-1.5 text-center text-[11px] tracking-[0.14em] text-white/75 uppercase">
			Extra info provided by{" "}
			{sources.map((source, index) => (
				<span key={source.id}>
					{index > 0 ? (index === sources.length - 1 ? " and " : ", ") : null}
					<a
						href={source.href}
						target="_blank"
						rel="noopener noreferrer"
						className="decoration-masterwork/80 text-masterwork/80 underline-offset-0 transition-all hover:text-white/90 hover:underline hover:underline-offset-2"
					>
						{source.label}
					</a>
				</span>
			))}
			{variantLabel ? (
				<span className="text-white/55"> ({variantLabel})</span>
			) : null}
		</p>
	);
}

function isToggleableSource(
	sourceId: DescriptionBlock["sourceId"],
): sourceId is DescriptionSourceToggle {
	return sourceId === "bungie" || sourceId === "clarity" || sourceId === "ddc";
}

// In-game text first, then who the community text below it came from, then the
// community text itself - but the per-group config can reorder the bodies, and
// an entry can now carry two community descriptions (Clarity's and the
// DDC's), so the attribution has to say which is which.
function EntryDescriptions(props: TooltipContentProps) {
	const { entry } = props;
	const visibleSources = useSettingsStore((state) => state.visibleSources);

	const blocks = getDescriptionBlocks(entry).filter(
		(block) =>
			!isToggleableSource(block.sourceId) || visibleSources[block.sourceId],
	);

	if (blocks.length === 0) {
		return (
			<p className="p-4 text-center text-xs text-white/45">
				All description sources are hidden. Re-enable one in the settings menu.
			</p>
		);
	}

	const communityBlocks = blocks.filter((block) => block.sourceId !== "bungie");
	// With a single community body the combined bar can credit every source that
	// fed the entry, exactly as before. With two, that bar would be ambiguous -
	// label each body with its own source instead.
	const labelPerBlock = communityBlocks.length > 1;
	const combinedSources = labelPerBlock ? [] : getSourceAttribution(entry);
	const firstCommunityBlock = communityBlocks[0];
	// Two bodies from the same source (the Arc and Prismatic DDC rows for an
	// aspect, say) need the tab name to tell them apart.
	const duplicatedSourceIds = new Set(
		communityBlocks
			.map((block) => block.sourceId)
			.filter((sourceId, index, all) => all.indexOf(sourceId) !== index),
	);

	return (
		<>
			{blocks.map((block, index) => {
				const isCommunity = block.sourceId !== "bungie";
				const blockSource = getAttributionSource(block.sourceId);

				return (
					<div key={`${block.sourceId}-${index}`}>
						{isCommunity && labelPerBlock && blockSource ? (
							<SourceAttribution
								sources={[blockSource]}
								variantLabel={
									duplicatedSourceIds.has(block.sourceId)
										? block.variantLabel
										: undefined
								}
							/>
						) : null}

						{isCommunity &&
						!labelPerBlock &&
						block === firstCommunityBlock &&
						combinedSources.length > 0 ? (
							<SourceAttribution sources={combinedSources} />
						) : null}

						<DescriptionText
							{...props}
							text={block.text}
							annotations={block.annotations}
							iconGlyphs={block.iconGlyphs}
						/>
					</div>
				);
			})}
		</>
	);
}

function ExoticContent(props: TooltipContentProps) {
	const { entry } = props;

	return (
		<>
			<div className="m-2 bg-blue-950/15 px-2 py-2 shadow-md shadow-blue-950/15">
				<div className="grid grid-cols-[50px_1fr] items-center gap-2">
					<IconSlot
						iconPath={entry.secondaryIconPath}
						label={entry.secondaryName ?? "Exotic Item"}
					/>
					<div>
						<p className="text-[11px] tracking-[0.14em] text-white/45 uppercase">
							Item
						</p>
						<p className="text-sm font-medium text-white/90">
							{entry.secondaryName ?? "Unknown Item"}
						</p>
					</div>
				</div>
			</div>

			<EntryDescriptions {...props} />
		</>
	);
}

export function TooltipBody(props: TooltipContentProps) {
	if (props.entry.kind === "exotic_item_perk") {
		return <ExoticContent {...props} />;
	}

	return <EntryDescriptions {...props} />;
}
