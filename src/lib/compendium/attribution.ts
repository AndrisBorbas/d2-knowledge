import type { Entry, UnifiedSourceId } from "./model";

const SOURCE_LABELS: Partial<Record<UnifiedSourceId, string>> = {
	foundry: "Clarity",
	sheet: "the Data Compendium",
};

// Merged entries keep the union of every source that contributed, so an entry
// present in both Clarity and the sheet credits both.
export function getSourceAttribution(entry: Entry): string | null {
	const sourceIds: UnifiedSourceId[] = entry.sourceRefs?.length
		? entry.sourceRefs.map((ref) => ref.sourceId)
		: entry.sourceId
			? [entry.sourceId]
			: [];

	const labels: string[] = [];
	for (const sourceId of sourceIds) {
		const label = SOURCE_LABELS[sourceId];
		if (!label || labels.includes(label)) continue;
		labels.push(label);
	}

	if (labels.length === 0) return null;

	const joined =
		labels.length === 1
			? labels[0]
			: `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

	return `Extra info provided by ${joined}`;
}
