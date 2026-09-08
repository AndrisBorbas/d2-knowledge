import type {
	BungieSubclass,
	BungieSubclassOption,
} from "@/lib/bungie/snapshot";
import type { SubclassSlotId } from "@/lib/bungie/subclass-schema";
import { normalizeLookupName } from "@/lib/utils/text";

import type { AnnotatedEntry } from "./model";

export type SubclassOption = BungieSubclassOption & {
	// The compendium entry that documents this option, when one exists. The
	// manifest and the community sources disagree about hashes - Clarity files
	// Solar Consecration under the Solar aspect's hash, where Prismatic has its
	// own item for the same aspect - so the join is by title.
	entryId?: string;
};

export type SubclassSlot = {
	id: SubclassSlotId;
	label: string;
	// True when all three classes get the same options, which is how the game
	// splits its own screen: fragments and (on the older elements) grenades are
	// the same everywhere, everything else is the class's own.
	shared: boolean;
	options: SubclassOption[];
};

export type Subclass = {
	hash: number;
	name: string;
	className: string;
	classSlug: string;
	element: string;
	elementSlug: string;
	iconPath?: string;
	screenshotPath?: string;
	slots: SubclassSlot[];
};

export const SLOT_LABELS: Record<SubclassSlotId, string> = {
	supers: "Super",
	class_abilities: "Class Ability",
	movement: "Movement",
	melee: "Melee",
	grenades: "Grenade",
	aspects: "Aspects",
	fragments: "Fragments",
	transcendence: "Transcendence",
	prism_grenade: "Prismatic Grenade",
};

export const CLASS_SLUGS = ["hunter", "warlock", "titan"] as const;

export const ELEMENT_SLUGS = [
	"arc",
	"solar",
	"void",
	"stasis",
	"strand",
	"prismatic",
] as const;

// An entry whose title an ability could plausibly own. A weapon perk sharing a
// name with an aspect would otherwise win the lookup.
function isAbilityEntry(entry: AnnotatedEntry) {
	return (
		entry.kind === "ability" ||
		entry.groups.includes("Abilities") ||
		entry.groups.includes("Fragments") ||
		entry.groups.includes("Aspect")
	);
}

function buildEntryIdByTitle(entries: AnnotatedEntry[]) {
	const preferred = new Map<string, string>();
	const fallback = new Map<string, string>();

	for (const entry of entries) {
		const key = normalizeLookupName(entry.title);
		if (!key) continue;

		const target = isAbilityEntry(entry) ? preferred : fallback;
		if (!target.has(key)) {
			target.set(key, entry.id);
		}
	}

	return (title: string) => {
		const key = normalizeLookupName(title);
		return preferred.get(key) ?? fallback.get(key);
	};
}

function toSharedSlotKeys(subclasses: BungieSubclass[]) {
	// element -> slot -> class -> the option names that class is offered.
	const byElement = new Map<string, Map<string, Map<string, string>>>();

	for (const subclass of subclasses) {
		const bySlot = byElement.get(subclass.element) ?? new Map();
		byElement.set(subclass.element, bySlot);

		for (const slot of subclass.slots) {
			const byClass = bySlot.get(slot.id) ?? new Map<string, string>();
			bySlot.set(slot.id, byClass);
			byClass.set(
				subclass.className,
				slot.options
					.map((option) => option.name)
					.sort()
					.join("|"),
			);
		}
	}

	const shared = new Set<string>();
	for (const [element, bySlot] of byElement) {
		for (const [slotId, byClass] of bySlot) {
			const signatures = [...byClass.values()];
			if (signatures.length < 3) continue;
			if (signatures.some((signature) => signature !== signatures[0])) continue;
			shared.add(`${element}|${slotId}`);
		}
	}

	return shared;
}

export function buildSubclasses(
	entries: AnnotatedEntry[],
	bungieSubclasses: BungieSubclass[],
): Subclass[] {
	const findEntryId = buildEntryIdByTitle(entries);
	const sharedSlots = toSharedSlotKeys(bungieSubclasses);

	return bungieSubclasses.map((subclass) => ({
		hash: subclass.hash,
		name: subclass.name,
		className: subclass.className,
		classSlug: subclass.classSlug,
		element: subclass.element,
		elementSlug: subclass.elementSlug,
		iconPath: subclass.iconPath,
		screenshotPath: subclass.screenshotPath,
		slots: subclass.slots.map((slot) => ({
			id: slot.id,
			label: SLOT_LABELS[slot.id],
			shared: sharedSlots.has(`${subclass.element}|${slot.id}`),
			options: slot.options.map((option) => ({
				...option,
				entryId: findEntryId(option.name),
			})),
		})),
	}));
}

// Generic over the row shape so the index page can look one up straight off
// the resolver, before the compendium join has happened.
export function findSubclass<
	T extends { classSlug: string; elementSlug: string },
>(subclasses: T[], classSlug: string, elementSlug: string) {
	return subclasses.find(
		(subclass) =>
			subclass.classSlug === classSlug && subclass.elementSlug === elementSlug,
	);
}

// The entries a subclass page has to serialize: one per option that resolved,
// which is what `buildTooltipBundle` is then given.
export function getSubclassEntries(
	subclass: Subclass,
	entries: AnnotatedEntry[],
) {
	const entryById = new Map(entries.map((entry) => [entry.id, entry]));
	const seen = new Set<string>();
	const selected: AnnotatedEntry[] = [];

	for (const slot of subclass.slots) {
		for (const option of slot.options) {
			if (!option.entryId || seen.has(option.entryId)) continue;
			const entry = entryById.get(option.entryId);
			if (!entry) continue;
			seen.add(option.entryId);
			selected.push(entry);
		}
	}

	return selected;
}
