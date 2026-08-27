import { CLARITY_URL, DATA_COMPENDIUM_SHEET_URL } from "@/lib/site/meta";

import type { UnifiedSourceId } from "./model";

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
