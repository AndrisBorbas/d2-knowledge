"use client";

import Image from "next/image";

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

function SetBonusContent({
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="p-4 text-center text-sm whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
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

function ExoticContent({
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
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

			<p className="p-4 text-center text-sm whitespace-pre-wrap text-white/90">
				<TextWithTooltips
					text={entry.description}
					annotations={entry.annotations}
					entry={entry}
					entryMap={entryMap}
					keywordById={keywordMap}
					onKeywordHover={onKeywordHover}
					onKeywordLeave={onKeywordLeave}
					onKeywordClick={onKeywordClick}
				/>
			</p>
		</>
	);
}

function DefaultContent({
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="p-4 text-center text-sm whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
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

export function TooltipBody(props: TooltipContentProps) {
	if (props.entry.kind === "exotic_item_perk") {
		return <ExoticContent {...props} />;
	}

	if (props.entry.kind === "armor_set_bonus") {
		return <SetBonusContent {...props} />;
	}

	return <DefaultContent {...props} />;
}
