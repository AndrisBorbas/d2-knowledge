import {
	groupEntriesByTab,
	mergeUnifiedEntries,
	toEntries,
} from "@/lib/data/aggregate";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
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
	const bungieResolver = await loadBungieManifestSnapshotResolver();
	const enrichedUnifiedEntries = mergedUnifiedEntries.map((entry) => {
		if (entry.iconPath) return entry;
		if (!bungieResolver) return entry;

		if (entry.section === "Aspect") {
			const itemEnrichment = bungieResolver.getItemEnrichmentByTitle(
				entry.title,
			);
			if (itemEnrichment?.itemIconPath) {
				return {
					...entry,
					iconPath: itemEnrichment.itemIconPath,
				};
			}
		}

		const enrichment = bungieResolver.getPerkEnrichmentByTitle(entry.title);
		if (!enrichment?.perkIconPath) return entry;

		return {
			...entry,
			iconPath: enrichment.perkIconPath,
		};
	});
	const mergedEntries = toEntries(enrichedUnifiedEntries);

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
