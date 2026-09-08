import {
	classifyUnifiedKind,
	type UnifiedEntry,
} from "@/lib/compendium/unified";

import { loadBungieManifestSnapshotResolver } from "./snapshot";
import { type SubclassSlotId, toSlug } from "./subclass-schema";

// The DDC's own section names, so a manifest-only ability lands in the same
// group chips - and the same glossary filters - as the ones the sheet covers.
// "Movement Abilities" is new: the sheet has no jumps at all.
const SECTION_BY_SLOT: Record<SubclassSlotId, string> = {
	supers: "Super Abilities",
	class_abilities: "Class Abilities",
	movement: "Movement Abilities",
	melee: "Melee Abilities",
	grenades: "Grenade Abilities",
	aspects: "Aspect",
	fragments: "Fragments",
	// Transcendence is a mechanic the sheet files under the Prismatic glossary,
	// not an ability slot, and the merge key has to agree with that.
	transcendence: "Glossary",
	prism_grenade: "Grenade Abilities",
};

// Sections whose options differ per class, mirroring the DDC's own scoping.
const CLASS_SCOPED_SECTIONS = new Set([
	"Super Abilities",
	"Class Abilities",
	"Movement Abilities",
	"Melee Abilities",
	"Grenade Abilities",
	"Aspect",
]);

type Draft = {
	title: string;
	section: string;
	itemHash: number;
	classNames: Set<string>;
	// Prismatic is left out: it borrows from every element, so counting it
	// would make every option it offers look element-agnostic.
	elements: Set<string>;
};

// Every ability, aspect and fragment the 18 subclass items offer, as unified
// entries. These are appended after the DDC and Clarity sources and sit last in
// the merge priority, so they only ever create an entry nobody else covers -
// the jumps, most of all, which no community source documents. Anything that
// does have community text merges away here and is joined back by title in
// src/lib/compendium/subclasses.ts.
export async function loadSubclassUnifiedEntries(): Promise<UnifiedEntry[]> {
	const resolver = await loadBungieManifestSnapshotResolver();
	const subclasses = resolver?.getSubclasses() ?? [];
	if (subclasses.length === 0) return [];

	// Prismatic borrows its options from the other elements, so it goes last:
	// the first element to claim an option is the one the entry is filed under,
	// which is where the DDC files it too.
	const ordered = [...subclasses].sort((left, right) => {
		const leftPrismatic = left.element === "Prismatic" ? 1 : 0;
		const rightPrismatic = right.element === "Prismatic" ? 1 : 0;
		return leftPrismatic - rightPrismatic;
	});

	const drafts = new Map<string, Draft>();

	for (const subclass of ordered) {
		for (const slot of subclass.slots) {
			const section = SECTION_BY_SLOT[slot.id];

			for (const option of slot.options) {
				const key = `${section}|${option.name.toLowerCase()}`;
				const existing = drafts.get(key);
				if (existing) {
					existing.classNames.add(subclass.className);
					if (subclass.element !== "Prismatic") {
						existing.elements.add(subclass.element);
					}
					continue;
				}

				drafts.set(key, {
					title: option.name,
					section,
					itemHash: option.hash,
					classNames: new Set([subclass.className]),
					elements:
						subclass.element === "Prismatic"
							? new Set()
							: new Set([subclass.element]),
				});
			}
		}
	}

	let index = 0;
	return [...drafts.values()].map((draft) => {
		// A jump - and a class ability - is the same on every subclass the class
		// has, so filing it under whichever element happened to be read first
		// would be an accident. Those get the section as their tab instead,
		// which is how the DDC files its own Class Abilities.
		const element = draft.elements.size === 1 ? [...draft.elements][0] : null;
		const groups = [element ?? draft.section, draft.section];
		if (CLASS_SCOPED_SECTIONS.has(draft.section)) {
			groups.push("Abilities", ...draft.classNames);
		}

		const row = index++;

		return {
			id: `bungie:${String(draft.itemHash)}:${toSlug(draft.title)}`,
			tab: element ?? draft.section,
			section: draft.section,
			groups: [...new Set(groups)],
			source: { tab: "bungie", row, column: 0 },
			title: draft.title,
			// The in-game text is attached later, by the official-description
			// pass in buildCompendiumDataset, which looks it up by itemHash.
			description: "",
			kind: classifyUnifiedKind({
				tab: element ?? draft.section,
				section: draft.section,
			}),
			sourceId: "bungie",
			sourceRefs: [
				{
					sourceId: "bungie",
					sourceKey: String(draft.itemHash),
					itemHash: draft.itemHash,
				},
			],
			itemHash: draft.itemHash,
		} satisfies UnifiedEntry;
	});
}
