import {
	COMPENDIUM_ACTIVE_TAB_NAMES,
	COMPENDIUM_SHEET_ID,
	COMPENDIUM_TAB_NORMALIZATION,
} from "@/lib/sheet/data";
import type { Entry, TabData } from "@/lib/sheet/model";
import { normalizeTabs } from "@/lib/sheet/normalize";
import { fetchSheetTabs } from "@/lib/sheet/sheet";

import {
	classifyUnifiedKind,
	type UnifiedEntry,
	type UnifiedSourceRef,
} from "../unified/model";

function normalizeTitle(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export async function loadSheetTabs(): Promise<TabData[]> {
	const rawTabs = await fetchSheetTabs(
		COMPENDIUM_SHEET_ID,
		COMPENDIUM_ACTIVE_TAB_NAMES,
	);
	return normalizeTabs(rawTabs, COMPENDIUM_TAB_NORMALIZATION);
}

export function toUnifiedSheetEntries(tabs: TabData[]) {
	const entries = tabs.flatMap((tab) => tab.entries);
	const unifiedEntries = entries.map((entry): UnifiedEntry => {
		const sourceRef: UnifiedSourceRef = {
			sourceId: "sheet",
			sourceKey: `${entry.source.tab}:${entry.source.row}:${entry.source.column}`,
			tab: entry.source.tab,
			row: entry.source.row,
			column: entry.source.column,
		};

		return {
			...entry,
			id: `sheet:${normalizeTitle(entry.title)}:${entry.source.row}:${entry.source.column}`,
			kind: classifyUnifiedKind({
				tab: entry.tab,
				section: entry.section,
			}),
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
};

export async function loadSheetSource(): Promise<SheetSourceResult> {
	const tabs = await loadSheetTabs();
	const { entries, unifiedEntries } = toUnifiedSheetEntries(tabs);
	return { tabs, entries, unifiedEntries };
}
