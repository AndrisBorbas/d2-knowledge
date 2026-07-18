import {
	COMPENDIUM_ACTIVE_TAB_NAMES,
	COMPENDIUM_SHEET_ID,
	COMPENDIUM_TAB_NORMALIZATION,
} from "./data";
import { annotateEntries, buildKeywords } from "./keywords";
import {
	type CompendiumDataset,
	compendiumDatasetSchema,
	type Entry,
} from "./model";
import { normalizeTabs } from "./normalize";
import { fetchSheetTabs } from "./sheet";

export async function buildCompendiumDataset(): Promise<CompendiumDataset> {
	const rawTabs = await fetchSheetTabs(
		COMPENDIUM_SHEET_ID,
		COMPENDIUM_ACTIVE_TAB_NAMES,
		// ["Arc"],
	);
	const normalizedTabs = normalizeTabs(rawTabs, COMPENDIUM_TAB_NORMALIZATION);

	const allEntries: Entry[] = normalizedTabs.flatMap((tab) => tab.entries);
	const keywords = buildKeywords(allEntries);
	const annotatedEntries = annotateEntries(allEntries, keywords);

	const entryMap = new Map(annotatedEntries.map((entry) => [entry.id, entry]));
	const tabs = normalizedTabs.map((tab) => ({
		name: tab.name,
		entries: tab.entries.map((entry) => entryMap.get(entry.id) ?? entry),
	}));

	const dataset = {
		generatedAt: new Date().toISOString(),
		tabs,
		keywords,
	};

	return compendiumDatasetSchema.parse(dataset);
}
