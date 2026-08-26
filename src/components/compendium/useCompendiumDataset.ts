"use client";

import { useEffect, useState } from "react";

import { COMPENDIUM_ASSET_URL } from "@/lib/compendium/asset";
import type { CompendiumDataset } from "@/lib/compendium/model";

// The page is prerendered with a seed of the first entries so there is something
// to look at immediately, then the full dataset arrives from the static asset.
// Everything downstream is memoized on `dataset.entries`/`dataset.keywords`, so
// swapping the object is enough to widen the list, the search and the tooltips.
export function useCompendiumDataset(seed: CompendiumDataset) {
	const [dataset, setDataset] = useState(seed);
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		const controller = new AbortController();

		async function load() {
			try {
				const response = await fetch(COMPENDIUM_ASSET_URL, {
					signal: controller.signal,
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				// Not zod-parsed on purpose: this is our own build artifact from the
				// same origin, and validating ~4.6 MB would block the main thread for
				// longer than the fetch itself takes.
				setDataset((await response.json()) as CompendiumDataset);
				setIsComplete(true);
			} catch (error) {
				if (controller.signal.aborted) return;
				// The seed stays on screen; the list is narrower but usable.
				console.error("Failed to load the full compendium dataset", error);
			}
		}

		void load();
		return () => controller.abort();
	}, []);

	return { dataset, isComplete };
}
