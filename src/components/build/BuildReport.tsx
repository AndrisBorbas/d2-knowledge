"use client";

import { Check, ClipboardCopy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ELEMENT_BORDER_CLASS } from "@/components/abilities/elementStyles";
import { ClickedTooltipsDrawer } from "@/components/compendium/ClickedTooltipsDrawer";
import { isMobileViewport } from "@/components/compendium/helpers";
import { HoverPreviewCard } from "@/components/compendium/HoverPreviewCard";
import { useClickedEntries } from "@/components/compendium/useClickedEntries";
import { useHoverPreview } from "@/components/compendium/useHoverPreview";
import { DdcVariantProvider } from "@/components/tooltip/DdcVariantContext";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { Button, UnpinButton } from "@/components/ui/Button";
import type { EntryCatalog } from "@/lib/dim/catalog";
import { renderBuildMarkdown } from "@/lib/dim/markdown";
import {
	collectBuildEntryIds,
	collectReferencedEffects,
	type ResolvedBuild,
	type ResolvedItem,
	type ResolvedPlug,
} from "@/lib/dim/resolve";
import { cn } from "@/lib/utils/utils";

import {
	EntryIconButton,
	type IconHandlers,
	IconRow,
	ItemHeader,
} from "./BuildIcons";

const COPIED_LABEL_MILLISECONDS = 2000;

// The longest address worth offering as a link: a pasted loadout can be a
// kilobyte of JSON, which makes for a poor URL.
const MAX_MARKDOWN_LINK_LENGTH = 1500;

// Sections sit two to a row on a wide screen so a build fills the page
// instead of running down a narrow strip. One with a lot in it takes the row.
function Section({
	title,
	description,
	isWide = false,
	children,
}: {
	title: string;
	description?: string;
	isWide?: boolean;
	children: React.ReactNode;
}) {
	return (
		<section className={cn("flex flex-col gap-3", isWide && "xl:col-span-2")}>
			<div>
				<h2 className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
					{title}
				</h2>
				{description ? (
					<p className="mt-1 max-w-3xl text-xs text-white/50">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

// Labelled icon rows that sit side by side and wrap, rather than one per line.
function GroupFlow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-x-8 gap-y-4">{children}</div>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
			{children}
		</h3>
	);
}

function CopyMarkdownButton({ getMarkdown }: { getMarkdown: () => string }) {
	const [hasCopied, setHasCopied] = useState(false);

	// Puts the label back after a moment, and not at all if the page is left.
	useEffect(() => {
		if (!hasCopied) return;
		const timer = setTimeout(
			() => setHasCopied(false),
			COPIED_LABEL_MILLISECONDS,
		);
		return () => clearTimeout(timer);
	}, [hasCopied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(getMarkdown());
			setHasCopied(true);
		} catch (error) {
			// Clipboard access can be refused, and the Markdown link still works.
			console.error("Failed to copy the build as Markdown", error);
		}
	};

	const Icon = hasCopied ? Check : ClipboardCopy;

	return (
		<Button
			variant="subtle"
			size="sm"
			onClick={() => void handleCopy()}
			className="flex items-center gap-2"
		>
			<Icon size={14} />
			{hasCopied ? "Copied" : "Copy as Markdown"}
		</Button>
	);
}

type BuildReportProps = {
	build: ResolvedBuild;
	catalog: EntryCatalog;
	// What was pasted, which the Markdown link repeats.
	pastedInput: string;
};

export function BuildReport({ build, catalog, pastedInput }: BuildReportProps) {
	const router = useRouter();

	// The glossary plus the entries made for plugs only the manifest knows.
	const entryMap = useMemo(() => {
		const entries = new Map(catalog.entryById);
		for (const entry of build.manifestEntries) {
			entries.set(entry.id, entry);
		}
		return entries;
	}, [catalog, build.manifestEntries]);
	const keywordMap = catalog.keywordById;

	const referencedEffects = useMemo(
		() => collectReferencedEffects(collectBuildEntryIds(build), catalog),
		[build, catalog],
	);

	const {
		hoverPreview,
		hoverCardRef,
		resolvedHoverTop,
		hoverCardStyle,
		hoveredEntry,
		showEntryPreview,
		handleKeywordHover: showKeywordPreview,
		handleKeywordLeave,
	} = useHoverPreview({ keywordMap, entryMap });

	// A tap fires the hover events too, and on a phone the drawer already shows
	// the description, so the floating card would only cover it twice over.
	const handleEntryHover = (entryId: string, anchorRect: DOMRect) => {
		if (isMobileViewport()) return;
		showEntryPreview(entryId, anchorRect);
	};
	const handleKeywordHover: typeof showKeywordPreview = (payload) => {
		if (isMobileViewport()) return;
		showKeywordPreview(payload);
	};

	// The same pinning the subclass pages use. On a phone, which has no room
	// for a side panel, pinning opens the drawer instead.
	const {
		clickedEntries: pinnedEntries,
		clickedEntryIds: pinnedIds,
		isMobileDrawerOpen,
		setIsMobileDrawerOpen,
		handleKeywordClick,
		toggleClickedEntry: togglePinned,
		handleRemoveClickedEntry: handleUnpin,
		handleClearClickedEntries: handleClearPinned,
	} = useClickedEntries({ keywordMap, entryMap });

	// This page has no group filter, so a group chip hands off to the glossary's.
	const handleGroupClick = (group: string) => {
		router.push(`/glossary?g=${encodeURIComponent(group)}`);
	};

	const handlers: IconHandlers = {
		pinnedIds: new Set(pinnedIds),
		onHover: handleEntryHover,
		onLeave: handleKeywordLeave,
		onToggle: togglePinned,
	};

	const renderPlugIcons = (plugs: ResolvedPlug[], borderClass?: string) => (
		<IconRow>
			{plugs.map((plug) => {
				const entry = entryMap.get(plug.entryId);
				if (!entry) return null;
				return (
					<EntryIconButton
						key={plug.hash}
						entry={entry}
						count={plug.count}
						borderClass={borderClass}
						fragmentSlots={plug.fragmentSlots}
						statMods={plug.statMods}
						handlers={handlers}
					/>
				);
			})}
		</IconRow>
	);

	const renderItems = (items: ResolvedItem[]) => (
		<div className="grid gap-x-8 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
			{items.map((item) => {
				const itemEntries = item.entryIds.flatMap((entryId) => {
					const entry = entryMap.get(entryId);
					return entry ? [entry] : [];
				});

				return (
					<div key={item.hash} className="flex flex-col gap-2">
						<ItemHeader item={item} />
						{itemEntries.length > 0 || item.plugs.length > 0 ? (
							<IconRow>
								{itemEntries.map((entry) => (
									<EntryIconButton
										key={entry.id}
										entry={entry}
										handlers={handlers}
									/>
								))}
								{item.plugs.map((plug) => {
									const entry = entryMap.get(plug.entryId);
									if (!entry) return null;
									return (
										<EntryIconButton
											key={plug.hash}
											entry={entry}
											count={plug.count}
											fragmentSlots={plug.fragmentSlots}
											statMods={plug.statMods}
											handlers={handlers}
										/>
									);
								})}
							</IconRow>
						) : (
							<p className="text-xs text-white/45">
								This link does not include perks for this item.
							</p>
						)}
					</div>
				);
			})}
		</div>
	);

	const subclass = build.subclass;
	// Subclass icons are framed in their element's color, like on the subclass pages.
	const subclassBorderClass = subclass
		? ELEMENT_BORDER_CLASS[subclass.element.toLowerCase()]
		: undefined;
	const canLinkMarkdown = pastedInput.length <= MAX_MARKDOWN_LINK_LENGTH;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
			<div className="flex flex-col gap-7">
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
					<div className="mt-1 flex flex-wrap items-center gap-3">
						<CopyMarkdownButton
							getMarkdown={() => renderBuildMarkdown(build, catalog)}
						/>
						<Button
							variant="subtle"
							size="sm"
							className="lg:hidden"
							onClick={() => setIsMobileDrawerOpen(true)}
						>
							Pinned ({pinnedEntries.length})
						</Button>
						{canLinkMarkdown ? (
							<a
								href={`/build.md?b=${encodeURIComponent(pastedInput)}`}
								target="_blank"
								rel="noopener noreferrer"
								className="decoration-masterwork/90 hover:text-masterwork text-xs text-white/70 underline underline-offset-2 transition-all hover:underline-offset-4"
							>
								Open as Markdown
							</a>
						) : null}
					</div>
					<p className="hidden text-xs text-white/45 lg:block">
						Hover an icon for its description, click it to pin it.
					</p>
					<p className="text-xs text-white/45 lg:hidden">
						Tap an icon to read its description.
					</p>
				</header>

				<div className="grid gap-x-8 gap-y-7 xl:grid-cols-2">
					{subclass ? (
						<Section title={`${subclass.element} ${subclass.className}`} isWide>
							<GroupFlow>
								{subclass.slots.map((slot) => (
									<div key={slot.id} className="flex flex-col gap-2">
										<SubHeading>{slot.label}</SubHeading>
										{renderPlugIcons(slot.plugs, subclassBorderClass)}
									</div>
								))}
							</GroupFlow>
						</Section>
					) : null}

					{build.weapons.length > 0 ? (
						<Section title="Weapons">{renderItems(build.weapons)}</Section>
					) : null}
					{build.armor.length > 0 ? (
						<Section title="Armor">{renderItems(build.armor)}</Section>
					) : null}

					{build.armorMods.length > 0 ? (
						<Section title="Armor mods">
							{renderPlugIcons(build.armorMods)}
						</Section>
					) : null}
					{build.armorPerks.length > 0 ? (
						<Section title="Armor perks">
							{renderPlugIcons(build.armorPerks)}
						</Section>
					) : null}

					{build.setBonuses.length > 0 ? (
						<Section title="Armor set bonuses">
							<GroupFlow>
								{build.setBonuses.map((bonus) => (
									<div key={bonus.setName} className="flex flex-col gap-2">
										<SubHeading>
											{bonus.setName} ({bonus.pieceCount} pieces)
										</SubHeading>
										{renderPlugIcons(bonus.plugs)}
									</div>
								))}
							</GroupFlow>
						</Section>
					) : null}

					{build.artifactPerks.length > 0 ? (
						<Section title="Artifact perks">
							{renderPlugIcons(build.artifactPerks)}
						</Section>
					) : null}

					{build.otherItems.length > 0 ? (
						<Section
							title="Other items"
							isWide
							description="Items the site has no name for. Weapon and armor names come with the next data refresh."
						>
							{renderItems(build.otherItems)}
						</Section>
					) : null}

					{referencedEffects.length > 0 ? (
						<Section
							title="Referenced effects"
							isWide
							description="Effects the descriptions above mention, most mentioned first."
						>
							<IconRow>
								{referencedEffects.flatMap((effect) => {
									const entry = entryMap.get(effect.entryId);
									return entry
										? [
												<EntryIconButton
													key={entry.id}
													entry={entry}
													handlers={handlers}
												/>,
											]
										: [];
								})}
							</IconRow>
						</Section>
					) : null}
				</div>

				{build.unrecognizedHashes.length > 0 ? (
					<details className="text-sm text-white/55">
						<summary className="cursor-pointer">
							{build.unrecognizedHashes.length} items in this build are not in
							Owl Sector&apos;s data
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
			</div>

			<aside className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
						Pinned ({pinnedEntries.length})
					</p>
					{pinnedEntries.length > 0 ? (
						<Button
							variant="danger"
							size="xs"
							onClick={handleClearPinned}
							className="backdrop-blur-md"
						>
							Clear all
						</Button>
					) : null}
				</div>
				{pinnedEntries.length === 0 ? (
					<p className="text-xs text-white/45">
						Pinned descriptions stay here while you look at others.
					</p>
				) : null}
				{/* The subclass's element picks which Compendium write-up an ability
				    shows, the same way a subclass page does. */}
				<DdcVariantProvider value={subclass?.element}>
					{pinnedEntries.map((entry) => (
						<div key={entry.id} className="relative">
							<Tooltip
								entry={entry}
								entryMap={entryMap}
								keywordMap={keywordMap}
								onKeywordHover={handleKeywordHover}
								onKeywordLeave={handleKeywordLeave}
								onKeywordClick={handleKeywordClick}
								onGroupClick={handleGroupClick}
							/>
							<UnpinButton
								onClick={() => handleUnpin(entry.id)}
								className="absolute top-1 right-1"
								label={`Unpin ${entry.title}`}
							/>
						</div>
					))}
				</DdcVariantProvider>
			</aside>

			<DdcVariantProvider value={subclass?.element}>
				<ClickedTooltipsDrawer
					isOpen={isMobileDrawerOpen}
					onClose={() => setIsMobileDrawerOpen(false)}
					clickedEntries={pinnedEntries}
					entryMap={entryMap}
					keywordMap={keywordMap}
					onKeywordHover={handleKeywordHover}
					onKeywordLeave={handleKeywordLeave}
					onKeywordClick={handleKeywordClick}
					onGroupClick={handleGroupClick}
					onRemove={handleUnpin}
				/>
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
			</DdcVariantProvider>
		</div>
	);
}
