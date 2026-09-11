"use client";

import { useEffect, useState } from "react";

import { WEAPONS_ASSET_URL } from "@/lib/weapons/asset";
import type { WeaponsDataset } from "@/lib/weapons/model";

// The page is prerendered with the first category's rows so there is a correct,
// complete list to read immediately, then the rest arrives from the static
// asset. Everything downstream is memoized on the dataset object, so swapping
// it is enough to widen the views, the search and the filters.
export function useWeaponsDataset(seed: WeaponsDataset) {
	const [dataset, setDataset] = useState(seed);
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		const controller = new AbortController();

		async function load() {
			try {
				const response = await fetch(WEAPONS_ASSET_URL, {
					signal: controller.signal,
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				// Not zod-parsed on purpose: this is our own build artifact from the
				// same origin, and the schema already ran when it was written.
				setDataset((await response.json()) as WeaponsDataset);
				setIsComplete(true);
			} catch (error) {
				if (controller.signal.aborted) return;
				// The seed stays on screen; one category is narrow but usable.
				console.error("Failed to load the full weapons dataset", error);
			}
		}

		void load();
		return () => controller.abort();
	}, []);

	return { dataset, isComplete };
}
