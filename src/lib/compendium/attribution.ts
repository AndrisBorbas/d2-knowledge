import { CLARITY_URL, DATA_COMPENDIUM_SHEET_URL } from "@/lib/site/meta";

import type { Entry, UnifiedSourceId } from "./model";

export type AttributionSource = {
	id: UnifiedSourceId;
	label: string;
	href: string;
};

const SOURCES: Partial<Record<UnifiedSourceId, AttributionSource>> = {
	clarity: {
		id: "clarity",
		label: "Clarity",
		href: CLARITY_URL,
	},
	ddc: {
		id: "ddc",
		label: "the Data Compendium",
		href: DATA_COMPENDIUM_SHEET_URL,
	},
};

export function getAttributionSource(
	sourceId: UnifiedSourceId,
): AttributionSource | undefined {
	return SOURCES[sourceId];
}

// Merged entries keep the union of every source that contributed, so an entry
// present in both Clarity and the DDC credits both.
export function getSourceAttribution(entry: Entry): AttributionSource[] {
	const sourceIds: UnifiedSourceId[] = entry.sourceRefs?.length
		? entry.sourceRefs.map((ref) => ref.sourceId)
		: entry.sourceId
			? [entry.sourceId]
			: [];

	const sources: AttributionSource[] = [];
	for (const sourceId of sourceIds) {
		const source = SOURCES[sourceId];
		if (!source || sources.some((existing) => existing.id === source.id)) {
			continue;
		}
		sources.push(source);
	}

	return sources;
}
