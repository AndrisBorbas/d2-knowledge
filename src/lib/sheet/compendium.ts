import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { mergeUnifiedEntries, toEntries } from "@/lib/data/aggregate";
import { Verbs } from "@/lib/data/glossary";
import { loadFoundrySource } from "@/lib/data/sources/foundry";
import { loadSheetSource } from "@/lib/data/sources/sheet";

import { annotateEntries, buildKeywords, toSlug } from "./keywords";
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

	const keywords = buildKeywords(mergedEntries, (className) =>
		bungieResolver?.getGlyphIconPath(className),
	);
	const annotatedEntries = annotateEntries(mergedEntries, keywords).map(
		(entry) => {
			const isVerb = Verbs.some(
				(verb) => toSlug(verb.name) === toSlug(entry.title.trim()),
			);
			return isVerb ? { ...entry, groups: [...entry.groups, "Verb"] } : entry;
		},
	);

	const dataset = {
		generatedAt: new Date().toISOString(),
		entries: annotatedEntries,
		keywords,
	};

	return compendiumDatasetSchema.parse(dataset);
}
