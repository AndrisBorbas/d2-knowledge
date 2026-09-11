import {
	buildTooltipBundle,
	type TooltipBundle,
} from "@/lib/compendium/bundle";
import type { CompendiumDataset } from "@/lib/compendium/model";
import { normalizeLookupName } from "@/lib/utils/text";

import type { WeaponsDataset } from "./model";

// The glossary entries for every perk the sheet recommends, so hovering a perk
// name on a weapon row shows the same card the glossary would. Kept out of
// `weapons.json` and fetched separately: it is heavier than the weapons data
// itself, and it is only needed once a row is expanded.
export type WeaponPerkBundle = TooltipBundle & {
	// Normalized perk name -> entry id. The sheet and the compendium spell
	// perks the same way, but not always with the same punctuation.
	entryIdByName: Record<string, string>;
};

const PERK_FIELDS = [
	"barrels",
	"magazines",
	"masterworks",
	"perks1",
	"perks2",
	"originTraits",
] as const;

export function collectWeaponPerkNames(weapons: WeaponsDataset) {
	const names = new Set<string>();
	for (const row of weapons.tierRows) {
		for (const field of PERK_FIELDS) {
			for (const name of row[field]) names.add(name);
		}
	}
	return names;
}

export function buildWeaponPerkBundle(
	weapons: WeaponsDataset,
	compendium: CompendiumDataset,
): { bundle: WeaponPerkBundle; misses: string[] } {
	// First entry wins, matching how the resolver elsewhere reads the dataset.
	const entryByName = new Map<string, string>();
	for (const entry of compendium.entries) {
		const key = normalizeLookupName(entry.title);
		if (key && !entryByName.has(key)) entryByName.set(key, entry.id);
	}
	const entryById = new Map(
		compendium.entries.map((entry) => [entry.id, entry]),
	);

	const entryIdByName: Record<string, string> = {};
	const wantedIds = new Set<string>();
	const misses: string[] = [];

	for (const name of collectWeaponPerkNames(weapons)) {
		const key = normalizeLookupName(name);
		const entryId = entryByName.get(key);
		// Barrel, magazine and masterwork options are stat rolls rather than
		// perks, so the glossary has nothing to say about most of them. A miss is
		// normal here and simply leaves that name without a preview.
		if (!entryId) {
			misses.push(name);
			continue;
		}
		entryIdByName[key] = entryId;
		wantedIds.add(entryId);
	}

	const entries = [...wantedIds]
		.map((id) => entryById.get(id))
		.filter((entry) => entry !== undefined);

	return {
		bundle: { ...buildTooltipBundle(compendium, entries), entryIdByName },
		misses: misses.sort(),
	};
}
