"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { DdcVariantProvider } from "@/components/tooltip/DdcVariantContext";
import type { TooltipKeywordClickPayload } from "@/components/tooltip/types";
import type { EntryCatalog } from "@/lib/dim/catalog";
import {
	collectBuildEntryIds,
	collectReferencedEffects,
	type ResolvedBuild,
	type ResolvedItem,
	type ResolvedPlug,
} from "@/lib/dim/resolve";

import {
	CardGrid,
	EntryCard,
	type EntryCardContext,
	ItemHeader,
	PlugCard,
	scrollToEntryCard,
} from "./BuildCards";

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div>
				<h2 className="text-xl font-semibold tracking-[0.12em] text-white uppercase">
					{title}
				</h2>
				{description ? (
					<p className="mt-1 max-w-3xl text-sm text-white/60">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

function PlugGrid({
	plugs,
	context,
}: {
	plugs: ResolvedPlug[];
	context: EntryCardContext;
}) {
	return (
		<CardGrid>
			{plugs.map((plug) => (
				<PlugCard key={plug.hash} plug={plug} context={context} />
			))}
		</CardGrid>
	);
}

function ItemBlock({
	item,
	context,
}: {
	item: ResolvedItem;
	context: EntryCardContext;
}) {
	const hasCards = item.entryIds.length > 0 || item.plugs.length > 0;

	return (
		<div className="flex flex-col gap-3">
			<ItemHeader item={item} />
			{hasCards ? (
				<CardGrid>
					{item.entryIds.map((entryId) => (
						<EntryCard key={entryId} entryId={entryId} context={context} />
					))}
					{item.plugs.map((plug) => (
						<PlugCard key={plug.hash} plug={plug} context={context} />
					))}
				</CardGrid>
			) : (
				<p className="text-sm text-white/45">
					No perks or mods were picked on this item.
				</p>
			)}
		</div>
	);
}

function ItemSection({
	title,
	description,
	items,
	context,
}: {
	title: string;
	description?: string;
	items: ResolvedItem[];
	context: EntryCardContext;
}) {
	if (items.length === 0) return null;

	return (
		<Section title={title} description={description}>
			<div className="flex flex-col gap-6">
				{items.map((item) => (
					<ItemBlock key={item.hash} item={item} context={context} />
				))}
			</div>
		</Section>
	);
}

type BuildReportProps = {
	build: ResolvedBuild;
	catalog: EntryCatalog;
};

export function BuildReport({ build, catalog }: BuildReportProps) {
	const router = useRouter();

	const { entryMap, keywordMap } = useMemo(
		() => ({ entryMap: catalog.entryById, keywordMap: catalog.keywordById }),
		[catalog],
	);

	const buildEntryIds = useMemo(() => collectBuildEntryIds(build), [build]);
	const referencedEffects = useMemo(
		() => collectReferencedEffects(buildEntryIds, catalog),
		[buildEntryIds, catalog],
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

	// A keyword in a description points at an entry that is, by construction,
	// somewhere on this page: either in the build or in the referenced effects.
	// So a click scrolls to it. One that points at nothing on the page is left to
	// the hover preview.
	const handleKeywordClick = ({
		keywordId,
		entryId,
	}: TooltipKeywordClickPayload) => {
		const referencedEntryId = keywordMap
			.get(keywordId)
			?.references.find((candidateId) => entryMap.has(candidateId));
		scrollToEntryCard(referencedEntryId ?? entryId);
	};

	// This page has no group filter, so a group chip hands off to the glossary's.
	const handleGroupClick = (group: string) => {
		router.push(`/glossary?g=${encodeURIComponent(group)}`);
	};

	const context: EntryCardContext = {
		entryMap,
		keywordMap,
		onKeywordHover: handleKeywordHover,
		onKeywordLeave: handleKeywordLeave,
		onKeywordClick: handleKeywordClick,
		onGroupClick: handleGroupClick,
	};

	const subclass = build.subclass;
	const hasArmorMods = build.armorMods.length > 0;

	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-col gap-2 border-b border-blue-500/50 pb-4">
				<p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
					{[build.className, subclass?.name].filter(Boolean).join(" · ") ||
						"DIM build"}
				</p>
				<h2 className="text-3xl font-black text-white uppercase lg:text-5xl">
					{build.name}
				</h2>
				{build.notes ? (
					<p className="max-w-4xl text-sm whitespace-pre-wrap text-white/72">
						{build.notes}
					</p>
				) : null}
				<p className="text-xs text-white/45">
					{buildEntryIds.length} glossary entries in the build
					{referencedEffects.length > 0
						? `, ${String(referencedEffects.length)} more that their descriptions refer to`
						: ""}
					.
				</p>
			</header>

			{subclass ? (
				// The subclass's element picks which Compendium write-up an ability
				// shows, the same way a subclass page does.
				<DdcVariantProvider value={subclass.element}>
					<Section
						title={`${subclass.element} ${subclass.className}`}
						description="Super, abilities, aspects and fragments."
					>
						<div className="flex flex-col gap-5">
							{subclass.slots.map((slot) => (
								<div key={slot.id} className="flex flex-col gap-2">
									<h3 className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
										{slot.label}
									</h3>
									<PlugGrid plugs={slot.plugs} context={context} />
								</div>
							))}
						</div>
					</Section>
				</DdcVariantProvider>
			) : null}

			<ItemSection title="Weapons" items={build.weapons} context={context} />
			<ItemSection title="Armor" items={build.armor} context={context} />

			{hasArmorMods ? (
				<Section
					title="Armor mods"
					description="Every mod the build asks for, with a count where it wants several copies."
				>
					<PlugGrid plugs={build.armorMods} context={context} />
				</Section>
			) : null}

			{build.armorPerks.length > 0 ? (
				<Section title="Armor perks">
					<PlugGrid plugs={build.armorPerks} context={context} />
				</Section>
			) : null}

			{build.setBonuses.length > 0 ? (
				<Section title="Set bonuses">
					<div className="flex flex-col gap-5">
						{build.setBonuses.map((bonus) => (
							<div key={bonus.setName} className="flex flex-col gap-2">
								<h3 className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
									{bonus.setName} ({bonus.pieceCount} pieces)
								</h3>
								<PlugGrid plugs={bonus.plugs} context={context} />
							</div>
						))}
					</div>
				</Section>
			) : null}

			{build.artifactPerks.length > 0 ? (
				<Section title="Artifact perks">
					<PlugGrid plugs={build.artifactPerks} context={context} />
				</Section>
			) : null}

			<ItemSection
				title="Other items"
				description="Items the site could not tell apart as a weapon or armor piece."
				items={build.otherItems}
				context={context}
			/>

			{referencedEffects.length > 0 ? (
				<Section
					title="Referenced effects"
					description="Effects the descriptions above mention, such as statuses and mechanics, most mentioned first."
				>
					<CardGrid>
						{referencedEffects.map((effect) => (
							<EntryCard
								key={effect.entryId}
								entryId={effect.entryId}
								context={context}
							/>
						))}
					</CardGrid>
				</Section>
			) : null}

			{build.unrecognizedHashes.length > 0 ? (
				<details className="text-sm text-white/55">
					<summary className="cursor-pointer">
						{build.unrecognizedHashes.length} items in this build are not in Owl
						Sector&apos;s data
					</summary>
					<p className="mt-2 max-w-3xl">
						These are usually shaders, ornaments and stat mods, or gear newer
						than the last data refresh. Their item hashes:{" "}
						<span className="font-mono text-white/70">
							{build.unrecognizedHashes.join(", ")}
						</span>
					</p>
				</details>
			) : null}

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
