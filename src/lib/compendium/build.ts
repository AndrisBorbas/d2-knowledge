import { STATIC_ICON_PATH_BY_GLYPH } from "@/lib/bungie/glyphs";
import { buildOfficialDescription } from "@/lib/bungie/officialDescription";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { loadSubclassUnifiedEntries } from "@/lib/bungie/subclass-source";
import { loadClaritySource } from "@/lib/clarity/source";
import { loadDdcSource } from "@/lib/ddc/source";
import { isSameDescription } from "@/lib/utils/text";

import { foldModFamilies, mergeUnifiedEntries, toEntries } from "./aggregate";
import { annotateEntries, buildKeywords, toSlug } from "./keywords/annotate";
import { Verbs } from "./keywords/data";
import { type CompendiumDataset, compendiumDatasetSchema } from "./model";

export async function buildCompendiumDataset(): Promise<CompendiumDataset> {
	const [ddcSource, claritySource, subclassEntries] = await Promise.all([
		loadDdcSource(),
		loadClaritySource(),
		loadSubclassUnifiedEntries(),
	]);

	// Subclass entries come last on purpose: the merge keeps whichever record
	// reached a title first when the incoming one ranks lower, so the manifest
	// can only ever fill a gap, never restate or relocate what the community
	// sources already say.
	const mergedUnifiedEntries = foldModFamilies(
		mergeUnifiedEntries([
			...ddcSource.unifiedEntries,
			...claritySource.unifiedEntries,
			...subclassEntries,
		]),
	);
	const bungieResolver = await loadBungieManifestSnapshotResolver();
	const enrichedUnifiedEntries = mergedUnifiedEntries.map((entry) => {
		if (!bungieResolver) return entry;

		// Ahead of the icon check below on purpose: an artifact perk's icon is
		// the one on its own inventory item, never the sandbox perk's, so this
		// replaces whatever a source already resolved.
		if (entry.kind === "artifact_perk") {
			const artifactEnrichment =
				bungieResolver.getArtifactPerkEnrichmentByTitle(entry.title);
			if (artifactEnrichment?.perkIconPath) {
				return {
					...entry,
					iconPath: artifactEnrichment.perkIconPath,
				};
			}
		}

		if (entry.iconPath) return entry;

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
	// whichever title/hashes won - the icon pass above can't host this because
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
		// DDC/Clarity text that just copies the in-game string would print the
		// same paragraph twice on the card - and with alternates the card can now
		// hold three bodies, so every one of them has to be checked.
		if (isSameDescription(built.text, entry.description)) return entry;

		const alternateDescriptions = entry.alternateDescriptions?.filter(
			(alternate) => !isSameDescription(built.text, alternate.text),
		);

		return {
			...entry,
			officialDescription: built.text,
			iconGlyphs: built.iconGlyphs.length > 0 ? built.iconGlyphs : undefined,
			alternateDescriptions:
				alternateDescriptions && alternateDescriptions.length > 0
					? alternateDescriptions
					: undefined,
		};
	});

	const mergedEntries = toEntries(withOfficialDescriptions);

	const keywords = buildKeywords(mergedEntries, (className) =>
		bungieResolver?.getGlyphIconPath(className),
	);
	const annotatedEntries = annotateEntries(
		mergedEntries,
		keywords,
		ddcSource.colors,
	).map((entry) => {
		const isVerb = Verbs.some(
			(verb) => toSlug(verb.name) === toSlug(entry.title.trim()),
		);
		return isVerb ? { ...entry, groups: [...entry.groups, "Verb"] } : entry;
	});

	const dataset = {
		generatedAt: new Date().toISOString(),
		entries: annotatedEntries,
		keywords,
	};

	return compendiumDatasetSchema.parse(dataset);
}
