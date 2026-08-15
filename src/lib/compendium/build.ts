import { STATIC_ICON_PATH_BY_GLYPH } from "@/lib/bungie/glyphs";
import { buildOfficialDescription } from "@/lib/bungie/officialDescription";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { loadFoundrySource } from "@/lib/foundry/source";
import { loadSheetSource } from "@/lib/sheet/source";

import { mergeUnifiedEntries, toEntries } from "./aggregate";
import { annotateEntries, buildKeywords, toSlug } from "./keywords/annotate";
import { Verbs } from "./keywords/data";
import { type CompendiumDataset, compendiumDatasetSchema } from "./model";

function isSameDescription(a: string, b: string) {
	const normalize = (value: string) =>
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.trim();
	return normalize(a) === normalize(b);
}

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
	const resolveGlyphIcon = (className: string) =>
		STATIC_ICON_PATH_BY_GLYPH[className] ??
		bungieResolver?.getGlyphIconPath(className);

	// Runs after the merge so each surviving entry is looked up once, using
	// whichever title/hashes won — the icon pass above can't host this because
	// it early-returns for entries that already have an icon.
	const withOfficialDescriptions = enrichedUnifiedEntries.map((entry) => {
		const raw = bungieResolver?.getOfficialDescription({
			perkHash: entry.perkHash,
			itemHash: entry.itemHash,
			title: entry.title,
		});
		if (!raw) return entry;

		const built = buildOfficialDescription({
			rawDescription: raw,
			existingGlyphs: entry.iconGlyphs ?? [],
			resolveGlyphIcon,
		});
		if (!built) return entry;
		// Sheet/Clarity text that just copies the in-game string would print the
		// same paragraph twice on the card.
		if (isSameDescription(built.text, entry.description)) return entry;

		return {
			...entry,
			officialDescription: built.text,
			iconGlyphs: built.iconGlyphs.length > 0 ? built.iconGlyphs : undefined,
		};
	});

	const mergedEntries = toEntries(withOfficialDescriptions);

	const keywords = buildKeywords(mergedEntries, (className) =>
		bungieResolver?.getGlyphIconPath(className),
	);
	const annotatedEntries = annotateEntries(
		mergedEntries,
		keywords,
		sheetSource.colors,
	).map(
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
