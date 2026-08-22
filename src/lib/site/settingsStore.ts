import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TooltipAlign = "left" | "center";

// The three sources a reader can turn off. "manual" is not listed: nothing
// uses it yet, and it is always shown.
export type DescriptionSourceToggle = "bungie" | "clarity" | "ddc";

export const DESCRIPTION_SOURCE_TOGGLES: readonly DescriptionSourceToggle[] = [
	"bungie",
	"clarity",
	"ddc",
];

export const DESCRIPTION_SOURCE_LABELS: Record<
	DescriptionSourceToggle,
	string
> = {
	bungie: "In-game",
	clarity: "Clarity",
	ddc: "Data Compendium",
};

export const SETTINGS_STORAGE_KEY = "owlsector-settings";
export const LEGACY_TOOLTIP_ALIGN_STORAGE_KEY = "tooltip-text-align";

type SettingsState = {
	tooltipAlign: TooltipAlign;
	visibleSources: Record<DescriptionSourceToggle, boolean>;
	setTooltipAlign: (align: TooltipAlign) => void;
	toggleSource: (id: DescriptionSourceToggle) => void;
};

// skipHydration: the persisted value must not be read during the initial
// render (server has no localStorage, and reading it eagerly on the client
// would make that first render disagree with the server-rendered HTML).
// <SettingsHydrator> calls `.persist.rehydrate()` once mounted instead.
export const useSettingsStore = create<SettingsState>()(
	persist(
		(set, get) => ({
			tooltipAlign: "center",
			visibleSources: { bungie: true, clarity: true, ddc: true },
			setTooltipAlign: (align) => set({ tooltipAlign: align }),
			toggleSource: (id) =>
				set({
					visibleSources: {
						...get().visibleSources,
						[id]: !get().visibleSources[id],
					},
				}),
		}),
		{
			name: SETTINGS_STORAGE_KEY,
			version: 1,
			skipHydration: true,
			// A stored blob predates any source added (or renamed) since it was
			// written, and a missing key reads as false - which would silently hide
			// that source. Backfill from the defaults instead of trusting the blob.
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<SettingsState>;

				return {
					...current,
					...stored,
					visibleSources: {
						...current.visibleSources,
						...Object.fromEntries(
							DESCRIPTION_SOURCE_TOGGLES.filter(
								(id) => typeof stored.visibleSources?.[id] === "boolean",
							).map((id) => [id, stored.visibleSources?.[id]]),
						),
					},
				};
			},
		},
	),
);
