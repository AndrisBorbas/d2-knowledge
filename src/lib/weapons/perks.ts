import {
	buildTooltipBundle,
	type TooltipBundle,
} from "@/lib/compendium/bundle";
import {
	annotateText,
	buildKeywordTerms,
} from "@/lib/compendium/keywords/annotate";
import type {
	AnnotatedEntry,
	Annotation,
	CompendiumDataset,
} from "@/lib/compendium/model";
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
	// The damage tabs write their setup as prose - "Illegally Modded Holster,
	// 17 shots, with slugs, Vorpal Weapon" - so the glossary matcher is run
	// over that text here and the offsets travel with the bundle. Keyed by
	// `weaponTextKey`; a text with nothing to link is simply absent.
	textAnnotations: Record<string, Annotation[]>;
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

// One key per annotated string, since a row has more than one: the conditions
// behind a shot and the extra ticks it lists are separate blocks of text with
// separate offsets, and mixing their coordinate spaces would misplace a link.
export function weaponTextKey(rowId: string, field: string) {
	return `${rowId}:${field}`;
}

// Every prose cell on the two damage tabs. The tier tabs are not here: their
// perks are already whole names looked up through `entryIdByName`.
function collectWeaponTexts(weapons: WeaponsDataset) {
	const texts: { key: string; text: string }[] = [];

	const add = (rowId: string, field: string, text: string | undefined) => {
		if (text && text.trim().length > 0) {
			texts.push({ key: weaponTextKey(rowId, field), text });
		}
	};

	for (const row of weapons.damageShots) {
		add(row.id, "modifiers", row.modifiers);
		add(row.id, "otherTicks", row.otherTicks);
	}
	for (const row of weapons.sustained) {
		add(row.id, "loadout", row.loadout);
		add(row.id, "notes", row.notes);
	}

	return texts;
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

	// The same matcher the glossary runs over its own descriptions, so a term
	// links on the damage tabs exactly where it would link on an entry.
	const terms = buildKeywordTerms(compendium.keywords);
	const keywordById = new Map(
		compendium.keywords.map((keyword) => [keyword.id, keyword]),
	);

	const textAnnotations: Record<string, Annotation[]> = {};
	const matchedKeywordIds = new Set<string>();

	for (const { key, text } of collectWeaponTexts(weapons)) {
		const annotations = annotateText(text, terms);
		if (annotations.length === 0) continue;
		textAnnotations[key] = annotations;
		for (const annotation of annotations) {
			matchedKeywordIds.add(annotation.keywordId);
		}
	}

	const entries = [...wantedIds]
		.map((id) => entryById.get(id))
		.filter((entry) => entry !== undefined);

	const bundle = buildTooltipBundle(compendium, entries);

	// `buildTooltipBundle` walks the entries' own annotations, which know
	// nothing about the sheet's prose, so the keywords matched above and the
	// entries they open are folded in afterwards.
	const seenKeywordIds = new Set(bundle.keywords.map((keyword) => keyword.id));
	const inBundle = new Set(
		[...bundle.entries, ...bundle.relatedEntries].map((entry) => entry.id),
	);
	const related: AnnotatedEntry[] = [...bundle.relatedEntries];

	for (const keywordId of matchedKeywordIds) {
		const keyword = keywordById.get(keywordId);
		if (!keyword) continue;
		if (!seenKeywordIds.has(keywordId)) {
			seenKeywordIds.add(keywordId);
			bundle.keywords.push(keyword);
		}
		for (const referenceId of keyword.references) {
			if (inBundle.has(referenceId)) continue;
			const referenced = entryById.get(referenceId);
			if (!referenced) continue;
			inBundle.add(referenceId);
			related.push(referenced);
		}
	}

	return {
		bundle: {
			...bundle,
			relatedEntries: related,
			entryIdByName,
			textAnnotations,
		},
		misses: misses.sort(),
	};
}
