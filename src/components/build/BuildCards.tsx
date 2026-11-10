"use client";

import Image from "next/image";

import { Tooltip } from "@/components/tooltip/Tooltip";
import { IconSlot } from "@/components/tooltip/TooltipContent";
import type {
	TooltipKeywordClickPayload,
	TooltipKeywordHoverPayload,
} from "@/components/tooltip/types";
import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";
import type { ResolvedItem, ResolvedPlug } from "@/lib/dim/resolve";

// What every card needs to render a glossary entry and wire up the keyword
// hover and click inside it.
export type EntryCardContext = {
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: TooltipKeywordClickPayload) => void;
	onGroupClick: (group: string) => void;
};

// Cards carry their entry id in a data attribute, not an element id: the same
// entry can show up in more than one section, and element ids must be unique.
export function scrollToEntryCard(entryId: string) {
	const card = document.querySelector(
		`[data-entry-id="${CSS.escape(entryId)}"]`,
	);
	card?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function CountBadge({ count }: { count: number }) {
	if (count < 2) return null;

	return (
		<span
			className="bg-masterwork absolute top-1 right-1 z-10 px-1.5 py-0.5 text-xs font-bold text-black"
			title={`${String(count)} copies in this build`}
		>
			×{count}
		</span>
	);
}

export function EntryCard({
	entryId,
	count = 1,
	context,
}: {
	entryId: string;
	count?: number;
	context: EntryCardContext;
}) {
	const entry = context.entryMap.get(entryId);
	if (!entry) return null;

	return (
		<div data-entry-id={entryId} className="relative">
			<Tooltip
				entry={entry}
				entryMap={context.entryMap}
				keywordMap={context.keywordMap}
				onKeywordHover={context.onKeywordHover}
				onKeywordLeave={context.onKeywordLeave}
				onKeywordClick={context.onKeywordClick}
				onGroupClick={context.onGroupClick}
			/>
			<CountBadge count={count} />
		</div>
	);
}

// A plug the site knows by name only: Bungie's own text, with nothing from the
// community sources.
function FallbackPlugCard({ plug }: { plug: ResolvedPlug }) {
	return (
		<article className="borderHover h-fit bg-blue-950/10 backdrop-blur-md">
			<div className="relative grid grid-cols-[66px_1fr] items-center justify-start gap-4 border-b border-blue-600/50 bg-blue-950/30">
				<div className="bg-blue-950/50 p-2">
					<IconSlot iconPath={plug.iconPath} label={plug.name} />
				</div>
				<h5 className="text-xl font-semibold text-white">{plug.name}</h5>
				<CountBadge count={plug.count} />
			</div>
			<p className="p-4 text-sm whitespace-pre-wrap text-white/90">
				{plug.fallbackDescription ?? "No description available."}
			</p>
			<p className="px-4 pb-3 text-xs text-white/45">
				Not in the glossary yet, so this is the in-game text only.
			</p>
		</article>
	);
}

export function PlugCard({
	plug,
	context,
}: {
	plug: ResolvedPlug;
	context: EntryCardContext;
}) {
	if (plug.entryId) {
		return (
			<EntryCard entryId={plug.entryId} count={plug.count} context={context} />
		);
	}

	return <FallbackPlugCard plug={plug} />;
}

export function CardGrid({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
			{children}
		</div>
	);
}

export function ItemHeader({ item }: { item: ResolvedItem }) {
	return (
		<div className="flex items-center gap-3">
			{item.iconPath ? (
				<div className="relative border border-white/20 bg-black/50">
					<Image
						src={item.iconPath}
						alt=""
						width={64}
						height={64}
						className="size-16 object-cover"
					/>
				</div>
			) : (
				<div className="flex size-16 items-center justify-center border border-dashed border-white/20 bg-black/30 text-xs text-white/45">
					?
				</div>
			)}
			<div>
				<h3 className="text-2xl font-semibold text-white">
					{item.name ?? "Unknown item"}
				</h3>
				<p className="text-xs tracking-[0.12em] text-white/55 uppercase">
					{[
						item.tierLabel,
						item.isEquipped ? "Equipped" : "In inventory",
						item.name ? null : `Hash ${String(item.hash)}`,
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>
		</div>
	);
}
