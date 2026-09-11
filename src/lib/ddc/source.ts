import {
	type BungieManifestSnapshotResolver,
	loadBungieManifestSnapshotResolver,
} from "@/lib/bungie/snapshot";
import { classNames } from "@/lib/compendium/keywords/data";
import {
	type Entry,
	shiftSegmentsForSlice,
	type TabData,
} from "@/lib/compendium/model";
import {
	classifyUnifiedKind,
	type UnifiedEntry,
	type UnifiedSourceRef,
} from "@/lib/compendium/unified";

import type { SheetColorIndex } from "../sheets/api";
import { COMPENDIUM_TAB_NORMALIZATION } from "./config";
import {
	EXOTIC_CLASS_ITEM_BY_CLASS,
	EXOTIC_CLASS_TAB_NAME,
} from "./exotic-class-items";
import { normalizeTabs } from "./normalize";
import { readDdcSheetSnapshot } from "./snapshot";

function normalizeTitle(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

const ARMOR_SET_BONUS_DESCRIPTION_PATTERN =
	/^(\d+)\s*Piece\s*\|\s*(.+?)\s*\n+([\s\S]*)$/i;

function buildExtraInfo(pieceCount: string | undefined, setName: string) {
	const pieceLabel = pieceCount ? `${pieceCount} Piece` : undefined;
	return [pieceLabel, setName].filter(Boolean).join(" | ") || undefined;
}

function parseArmorSetBonusFields(entry: Entry) {
	const titleLines = entry.title
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	const setName = titleLines[0] ?? entry.title;
	const source = titleLines.slice(1).join(" - ") || undefined;

	const match = entry.description.match(ARMOR_SET_BONUS_DESCRIPTION_PATTERN);
	if (!match) {
		return {
			title: entry.title,
			description: entry.description,
			descriptionSegments: entry.descriptionSegments ?? [],
			secondaryName: setName,
			secondaryDetail: source,
			extraInfo: buildExtraInfo(undefined, setName),
			requiredSetCount: undefined as number | undefined,
		};
	}

	const [, pieceCount, bonusName, remainder] = match;
	const description = remainder.trim();
	const sliceStart = entry.description.indexOf(description);

	return {
		title: bonusName.trim(),
		description,
		descriptionSegments: shiftSegmentsForSlice(
			entry.descriptionSegments ?? [],
			sliceStart,
			description.length,
		),
		secondaryName: setName,
		secondaryDetail: source,
		extraInfo: buildExtraInfo(pieceCount, setName),
		requiredSetCount: Number(pieceCount),
	};
}

// Which Exotic Class Item the perk sits on, read back off the class groups
// the normalizer already worked out from the sheet's section headers. A
// class-agnostic perk drops on all three, so it names all three and shows no
// item icon - there is no one item to picture.
function exoticClassItemNames(groups: string[]) {
	return groups
		.filter((group) => classNames.includes(group))
		.map((className) => EXOTIC_CLASS_ITEM_BY_CLASS[className])
		.filter((itemName): itemName is string => Boolean(itemName));
}

export async function loadDdcTabs(): Promise<{
	tabs: TabData[];
	colors: SheetColorIndex;
}> {
	const { grid, colors } = await readDdcSheetSnapshot();
	return { tabs: normalizeTabs(grid, COMPENDIUM_TAB_NORMALIZATION), colors };
}

export function toUnifiedDdcEntries(
	tabs: TabData[],
	bungieResolver: BungieManifestSnapshotResolver | null = null,
) {
	const entries = tabs.flatMap((tab) => tab.entries);
	const unifiedEntries = entries.map((entry): UnifiedEntry => {
		const sourceRef: UnifiedSourceRef = {
			sourceId: "ddc",
			sourceKey: `${entry.source.tab}:${entry.source.row}:${entry.source.column}`,
			tab: entry.source.tab,
			row: entry.source.row,
			column: entry.source.column,
		};

		const kind = classifyUnifiedKind({
			tab: entry.tab,
			section: entry.section,
		});

		// Rarity is a filter of its own, the same way Clarity files the exotic
		// perks it ships.
		const groups =
			kind === "exotic_item_perk" ? [...entry.groups, "Exotic"] : entry.groups;

		if (kind === "armor_set_bonus") {
			const parsed = parseArmorSetBonusFields(entry);
			const bonusEnrichment = parsed.requiredSetCount
				? bungieResolver?.getArmorSetBonusPerkEnrichment({
						setName: parsed.secondaryName,
						requiredSetCount: parsed.requiredSetCount,
					})
				: null;
			const setIconPath = bungieResolver?.getArmorSetIconPath(
				parsed.secondaryName,
			);

			return {
				...entry,
				id: `ddc:${normalizeTitle(parsed.title)}:${entry.source.row}:${entry.source.column}`,
				kind,
				sourceId: "ddc",
				sourceRefs: [sourceRef],
				title: bonusEnrichment?.perkName ?? parsed.title,
				description: parsed.description,
				descriptionSegments: parsed.descriptionSegments,
				secondaryName: parsed.secondaryName,
				secondaryDetail: parsed.secondaryDetail,
				extraInfo: parsed.extraInfo,
				iconPath: bonusEnrichment?.perkIconPath,
				secondaryIconPath: setIconPath,
			};
		}

		if (entry.tab === EXOTIC_CLASS_TAB_NAME) {
			const itemNames = exoticClassItemNames(entry.groups);
			const itemName = itemNames.join(", ");
			const itemEnrichment =
				itemNames.length === 1
					? bungieResolver?.getItemEnrichmentByTitle(itemNames[0])
					: null;

			return {
				...entry,
				id: `ddc:${normalizeTitle(entry.title)}:${entry.source.row}:${entry.source.column}`,
				kind,
				groups,
				sourceId: "ddc",
				sourceRefs: [sourceRef],
				secondaryName: itemName || undefined,
				secondaryIconPath: itemEnrichment?.itemIconPath,
				extraInfo: itemName ? `Item: ${itemName}` : entry.extraInfo,
			};
		}

		return {
			...entry,
			id: `ddc:${normalizeTitle(entry.title)}:${entry.source.row}:${entry.source.column}`,
			kind,
			groups,
			sourceId: "ddc",
			sourceRefs: [sourceRef],
		};
	});

	return {
		entries,
		unifiedEntries,
	};
}

export type DdcSourceResult = {
	tabs: TabData[];
	entries: Entry[];
	unifiedEntries: UnifiedEntry[];
	colors: SheetColorIndex;
};

async function buildDdcSource(): Promise<DdcSourceResult> {
	const [{ tabs, colors }, bungieResolver] = await Promise.all([
		loadDdcTabs(),
		loadBungieManifestSnapshotResolver(),
	]);
	const { entries, unifiedEntries } = toUnifiedDdcEntries(tabs, bungieResolver);
	return { tabs, entries, unifiedEntries, colors };
}

// Normalizing the whole sheet is not cheap and the manifest script asks for it
// twice in one process. One promise per process, as elsewhere.
let cachedSource: Promise<DdcSourceResult> | null = null;

export function loadDdcSource() {
	cachedSource ??= buildDdcSource().catch((error: unknown) => {
		cachedSource = null;
		throw error;
	});
	return cachedSource;
}
