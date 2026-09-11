"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { buildBundleMaps } from "@/lib/compendium/bundle";
import { normalizeLookupName } from "@/lib/utils/text";
import { WEAPON_PERKS_ASSET_URL } from "@/lib/weapons/asset";
import type { WeaponPerkBundle } from "@/lib/weapons/perks";

const EMPTY_MAPS = buildBundleMaps({
	entries: [],
	relatedEntries: [],
	keywords: [],
});

// The glossary entries behind the recommended perks, which only matter once a
// row is expanded and its perk names are on screen. Heavier than the weapons
// dataset itself, so nothing is fetched until `load` is called and anyone who
// never opens a row never pays for it.
export function useWeaponPerks() {
	const [bundle, setBundle] = useState<WeaponPerkBundle | null>(null);
	const requested = useRef(false);

	const load = useCallback(() => {
		if (requested.current) return;
		requested.current = true;

		async function run() {
			try {
				const response = await fetch(WEAPON_PERKS_ASSET_URL);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				// Not zod-parsed, like the other build artifacts: same origin, and
				// the schema already ran when it was written.
				setBundle((await response.json()) as WeaponPerkBundle);
			} catch (error) {
				// Perk names stay plain links to the glossary, which is where the
				// preview would have sent the reader anyway.
				requested.current = false;
				console.error("Failed to load the weapon perk entries", error);
			}
		}

		void run();
	}, []);

	const { entryMap, keywordMap } = useMemo(
		() => (bundle ? buildBundleMaps(bundle) : EMPTY_MAPS),
		[bundle],
	);

	const entryIdForPerk = useCallback(
		(name: string) => bundle?.entryIdByName[normalizeLookupName(name)] ?? null,
		[bundle],
	);

	return { load, entryMap, keywordMap, entryIdForPerk };
}
