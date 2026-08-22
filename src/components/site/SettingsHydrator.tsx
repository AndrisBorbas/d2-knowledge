"use client";

import { useEffect } from "react";

import {
	LEGACY_TOOLTIP_ALIGN_STORAGE_KEY,
	SETTINGS_STORAGE_KEY,
	useSettingsStore,
} from "@/lib/site/settingsStore";

// The align preference used to live under its own localStorage key. Fold it
// into the combined settings blob once, before the store rehydrates, so nobody
// silently loses the setting they had.
function migrateLegacyTooltipAlign() {
	try {
		if (window.localStorage.getItem(SETTINGS_STORAGE_KEY)) return;

		const legacy = window.localStorage.getItem(
			LEGACY_TOOLTIP_ALIGN_STORAGE_KEY,
		);
		if (!legacy) return;

		const align = (JSON.parse(legacy) as { state?: { align?: unknown } })?.state
			?.align;
		if (align !== "left" && align !== "center") return;

		window.localStorage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({
				state: {
					tooltipAlign: align,
					visibleSources: { bungie: true, clarity: true, ddc: true },
				},
				version: 1,
			}),
		);
		window.localStorage.removeItem(LEGACY_TOOLTIP_ALIGN_STORAGE_KEY);
	} catch {
		// Private-mode localStorage or malformed JSON: fall back to defaults.
	}
}

// Store is created with skipHydration, so nothing reads localStorage until
// this fires post-mount - keeps the very first client render identical to
// the server-rendered HTML, then swaps in the persisted value right after.
export function SettingsHydrator() {
	useEffect(() => {
		migrateLegacyTooltipAlign();
		void useSettingsStore.persist.rehydrate();
	}, []);

	return null;
}
