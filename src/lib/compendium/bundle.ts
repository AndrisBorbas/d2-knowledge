import type { AnnotatedEntry, CompendiumDataset, Keyword } from "./model";

// Everything a page needs to render `Tooltip`s for a slice of the dataset:
// the entries themselves, the keywords their annotations point at, and the
// entries those keywords resolve to (hover previews only ever go one hop, see
// `useHoverPreview.handleKeywordHover`).
export type TooltipBundle = {
	entries: AnnotatedEntry[];
	relatedEntries: AnnotatedEntry[];
	keywords: Keyword[];
};

export function buildTooltipBundle(
	dataset: CompendiumDataset,
	entries: AnnotatedEntry[],
): TooltipBundle {
	const keywordById = new Map(
		dataset.keywords.map((keyword) => [keyword.id, keyword]),
	);
	const entryById = new Map(dataset.entries.map((entry) => [entry.id, entry]));
	const selectedIds = new Set(entries.map((entry) => entry.id));

	const keywords: Keyword[] = [];
	const seenKeywordIds = new Set<string>();
	const relatedEntries: AnnotatedEntry[] = [];
	const seenRelatedIds = new Set<string>();

	for (const entry of entries) {
		const annotations = [
			...entry.annotations,
			...(entry.officialAnnotations ?? []),
		];

		for (const annotation of annotations) {
			if (seenKeywordIds.has(annotation.keywordId)) continue;
			seenKeywordIds.add(annotation.keywordId);

			const keyword = keywordById.get(annotation.keywordId);
			if (!keyword) continue;
			keywords.push(keyword);

			for (const referenceId of keyword.references) {
				if (selectedIds.has(referenceId) || seenRelatedIds.has(referenceId)) {
					continue;
				}
				const referenced = entryById.get(referenceId);
				if (!referenced) continue;
				seenRelatedIds.add(referenceId);
				relatedEntries.push(referenced);
			}
		}
	}

	return { entries, relatedEntries, keywords };
}

export function buildBundleMaps(bundle: TooltipBundle) {
	const entryMap = new Map<string, AnnotatedEntry>();
	for (const entry of [...bundle.entries, ...bundle.relatedEntries]) {
		entryMap.set(entry.id, entry);
	}

	const keywordMap = new Map(
		bundle.keywords.map((keyword) => [keyword.id, keyword]),
	);

	return { entryMap, keywordMap };
}
