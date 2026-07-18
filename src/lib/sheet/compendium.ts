import {
	groupEntriesByTab,
	mergeUnifiedEntries,
	toEntries,
} from "@/lib/data/aggregate";
import { loadFoundrySource } from "@/lib/data/sources/foundry";
import { loadSheetSource } from "@/lib/data/sources/sheet";
import { annotateEntries, buildKeywords } from "./keywords";
import { type CompendiumDataset, compendiumDatasetSchema } from "./model";

export async function buildCompendiumDataset(): Promise<CompendiumDataset> {
	const [sheetSource, foundrySource] = await Promise.all([
		loadSheetSource(),
		loadFoundrySource(),
	]);

	const mergedUnifiedEntries = mergeUnifiedEntries([
		...sheetSource.unifiedEntries,
		...foundrySource.unifiedEntries,
	]);
	const mergedEntries = toEntries(mergedUnifiedEntries);

	const keywords = buildKeywords(mergedEntries);
	const annotatedEntries = annotateEntries(mergedEntries, keywords);

	const groupedByTab = groupEntriesByTab(annotatedEntries);
	const orderedTabNames = [
		...sheetSource.tabs.map((tab) => tab.name),
		...Array.from(groupedByTab.keys()).filter(
			(tabName) => !sheetSource.tabs.some((tab) => tab.name === tabName),
		),
	];

	const tabs = orderedTabNames
		.map((tabName) => ({
			name: tabName,
			entries: groupedByTab.get(tabName) ?? [],
		}))
		.filter((tab) => tab.entries.length > 0);

	const dataset = {
		generatedAt: new Date().toISOString(),
		tabs,
		keywords,
	};

	return compendiumDatasetSchema.parse(dataset);
}