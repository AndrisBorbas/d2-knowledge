import {
	type BungieManifestSnapshotResolver,
	loadBungieManifestSnapshotResolver,
} from "@/lib/bungie/snapshot";
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

import { fetchSheetTabsWithColors, type SheetColorIndex } from "./api";
import {
	COMPENDIUM_ACTIVE_TAB_NAMES,
	COMPENDIUM_SHEET_ID,
	COMPENDIUM_TAB_NORMALIZATION,
} from "./config";
import { normalizeTabs } from "./normalize";

function normalizeTitle(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

const ARMOR_SET_BONUS_DESCRIPTION_PATTERN =
	/^(\d+)\s*Piece\s*\|\s*(.+?)\s*\n+([\s\S]*)$/i;

function buildExtraInfo(
	pieceCount: string | undefined,
	setName: string,
) {
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

export async function loadSheetTabs(): Promise<{
	tabs: TabData[];
	colors: SheetColorIndex;
}> {
	const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY is not set");

	const { grid, colors } = await fetchSheetTabsWithColors(
		COMPENDIUM_SHEET_ID,
		COMPENDIUM_ACTIVE_TAB_NAMES,
		apiKey,
	);
	return { tabs: normalizeTabs(grid, COMPENDIUM_TAB_NORMALIZATION), colors };
}

export function toUnifiedSheetEntries(
	tabs: TabData[],
	bungieResolver: BungieManifestSnapshotResolver | null = null,
) {
	const entries = tabs.flatMap((tab) => tab.entries);
	const unifiedEntries = entries.map((entry): UnifiedEntry => {
		const sourceRef: UnifiedSourceRef = {
			sourceId: "sheet",
			sourceKey: `${entry.source.tab}:${entry.source.row}:${entry.source.column}`,
			tab: entry.source.tab,
			row: entry.source.row,
			column: entry.source.column,
		};

		const kind = classifyUnifiedKind({
			tab: entry.tab,
			section: entry.section,
		});

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
				id: `sheet:${normalizeTitle(parsed.title)}:${entry.source.row}:${entry.source.column}`,
				kind,
				sourceId: "sheet",
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

		return {
			...entry,
			id: `sheet:${normalizeTitle(entry.title)}:${entry.source.row}:${entry.source.column}`,
			kind,
			sourceId: "sheet",
			sourceRefs: [sourceRef],
		};
	});

	return {
		entries,
		unifiedEntries,
	};
}

export type SheetSourceResult = {
	tabs: TabData[];
	entries: Entry[];
	unifiedEntries: UnifiedEntry[];
	colors: SheetColorIndex;
};

export async function loadSheetSource(): Promise<SheetSourceResult> {
	const [{ tabs, colors }, bungieResolver] = await Promise.all([
		loadSheetTabs(),
		loadBungieManifestSnapshotResolver(),
	]);
	const { entries, unifiedEntries } = toUnifiedSheetEntries(
		tabs,
		bungieResolver,
	);
	return { tabs, entries, unifiedEntries, colors };
}
