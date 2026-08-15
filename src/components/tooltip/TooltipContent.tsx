"use client";

import Image from "next/image";

import {
	type AttributionSource,
	getSourceAttribution,
} from "@/lib/compendium/attribution";
import type { Annotation } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

import { TextWithTooltips } from "./TextWithTooltips";
import type { TooltipContentProps } from "./types";

export function IconSlot({
	iconPath,
	label,
}: {
	iconPath?: string;
	label: string;
}) {
	if (iconPath) {
		return (
			<div className="relative border border-white/20 bg-black/50">
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
	className?: string;
}) {
	return (
		<p
			className={cn(
				"p-4 text-center text-sm whitespace-pre-wrap text-white/90",
				className,
			)}
		>
			<TextWithTooltips
				text={text}
				annotations={annotations}
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

function SourceAttribution({ sources }: { sources: AttributionSource[] }) {
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
		</p>
	);
}

// In-game text first, then who the community text below it came from, then the
// community text itself.
function EntryDescriptions(props: TooltipContentProps) {
	const { entry } = props;
	const attributionSources = getSourceAttribution(entry);

	return (
		<>
			{entry.officialDescription ? (
				<DescriptionText
					{...props}
					text={entry.officialDescription}
					annotations={entry.officialAnnotations ?? []}
				/>
			) : null}

			{attributionSources.length > 0 ? (
				<SourceAttribution sources={attributionSources} />
			) : null}

			<DescriptionText
				{...props}
				text={entry.description}
				annotations={entry.annotations}
			/>
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
