import {
	ELEMENT_NAME_BY_TOKEN,
	SUBCLASS_SLOT_IDS,
	type SubclassSlotId,
} from "@/lib/bungie/subclass-schema";
import type { AnnotatedEntry } from "@/lib/compendium/model";
import { SLOT_LABELS } from "@/lib/compendium/subclasses";
import { cleanupDescriptionText, normalizeLookupName } from "@/lib/utils/text";

import { type EntryCatalog, toSetBonusKey } from "./catalog";
import { type DimIndex, toBungieUrl } from "./index-schema";
import type { DimLoadout, DimLoadoutItem } from "./loadout";

// What a plug is for, which decides between entries that share a name: a
// weapon perk and an armor mod can both be called "Surplus", and an aspect can
// share its name with a fragment.
type PlugContext =
	| { kind: "subclass"; element: string }
	| { kind: "weapon" }
	| { kind: "armor" }
	| { kind: "armor-mod" }
	| { kind: "exotic-perk" }
	| { kind: "artifact" }
	// An item that could not be told apart as a weapon or as armor.
	| { kind: "unknown" };

export type ResolvedPlug = {
	hash: number;
	name: string;
	iconPath?: string;
	// The glossary entry that documents this plug, when there is one.
	entryId?: string;
	// Bungie's own text, kept only for a plug with no glossary entry, so it still
	// shows something.
	fallbackDescription?: string;
	// How many times the build uses it: armor mods repeat.
	count: number;
};

export type ResolvedItem = {
	hash: number;
	// Absent when the hash is in none of the site's tables.
	name?: string;
	iconPath?: string;
	// "Exotic", "Legendary" or nothing when the tier is not known.
	tierLabel?: string;
	isEquipped: boolean;
	// Glossary entries about the item itself, which for an exotic is its
	// intrinsic perk.
	entryIds: string[];
	plugs: ResolvedPlug[];
};

export type ResolvedSubclassSlot = {
	id: SubclassSlotId | "other";
	label: string;
	plugs: ResolvedPlug[];
};

export type ResolvedSubclass = {
	hash: number;
	name: string;
	iconPath?: string;
	// "Solar", "Prismatic" and so on.
	element: string;
	className: string;
	slots: ResolvedSubclassSlot[];
};

export type ResolvedSetBonus = {
	setName: string;
	pieceCount: number;
	plugs: ResolvedPlug[];
};

export type ResolvedBuild = {
	name: string;
	// Absent for a loadout any class can use.
	className?: string;
	notes: string;
	subclass?: ResolvedSubclass;
	weapons: ResolvedItem[];
	armor: ResolvedItem[];
	// Items that are neither: ghosts and ships, or gear the site has no record of.
	otherItems: ResolvedItem[];
	armorMods: ResolvedPlug[];
	armorPerks: ResolvedPlug[];
	setBonuses: ResolvedSetBonus[];
	artifactPerks: ResolvedPlug[];
	// Hashes the site could not name at all. Mostly shaders and ornaments.
	unrecognizedHashes: number[];
};

const CLASS_NAMES = ["Titan", "Hunter", "Warlock"];

const TIER_LABELS: Record<number, string> = {
	5: "Legendary",
	6: "Exotic",
};

const ENHANCED_PREFIX = /^enhanced\s+/i;

// Bungie's descriptions embed glyph tokens like "[Stasis] Stasis crystals"
// that only render as icons in game. As plain text the token is noise.
const GLYPH_TOKEN_PATTERN = /\[[^\][]+\][ \t]*/g;

function stripGlyphTokens(description: string) {
	return cleanupDescriptionText(description.replace(GLYPH_TOKEN_PATTERN, ""));
}

function isAbilityEntry(entry: AnnotatedEntry) {
	return (
		entry.kind === "ability" ||
		entry.groups.includes("Abilities") ||
		entry.groups.includes("Fragments") ||
		entry.groups.includes("Aspect")
	);
}

function isWeaponPerkEntry(entry: AnnotatedEntry) {
	return (
		entry.kind === "weapon_perk_or_verb" ||
		entry.groups.includes("Weapon Perks") ||
		(entry.sourceRefs ?? []).some((ref) => ref.type?.startsWith("Weapon"))
	);
}

function isArmorModEntry(entry: AnnotatedEntry) {
	return entry.groups.includes("Armor Mods");
}

// How well an entry fits what the plug is used for. Only ever breaks ties
// between entries that already match the plug's hash or name.
function scoreEntry(entry: AnnotatedEntry, context: PlugContext) {
	switch (context.kind) {
		case "subclass": {
			let score = isAbilityEntry(entry) ? 4 : 0;
			// A fragment or aspect keeps its own write-up per element, and a
			// Prismatic one borrows from them.
			if (entry.groups.includes(context.element)) score += 2;
			if (entry.tab === context.element) score += 1;
			return score;
		}
		case "weapon":
			if (isWeaponPerkEntry(entry)) return 3;
			return entry.kind === "exotic_item_perk" ? 1 : 0;
		case "armor":
			if (isArmorModEntry(entry)) return 3;
			return entry.kind === "exotic_item_perk" ? 2 : 0;
		case "armor-mod":
			return isArmorModEntry(entry) ? 3 : 0;
		case "exotic-perk":
			return entry.kind === "exotic_item_perk" ? 3 : 0;
		case "artifact":
			return entry.kind === "artifact_perk" ? 5 : 0;
		case "unknown":
			return 0;
	}
}

function pickBestEntry(
	candidates: AnnotatedEntry[] | undefined,
	context: PlugContext,
) {
	let best: AnnotatedEntry | undefined;
	let bestScore = -1;

	for (const candidate of candidates ?? []) {
		const score = scoreEntry(candidate, context);
		// Strictly greater, so a tie keeps the entry that comes first in the data.
		if (score > bestScore) {
			best = candidate;
			bestScore = score;
		}
	}

	return best;
}

// Hash first, since Clarity entries are keyed by the very plug hash a loadout
// carries. The Compendium sheet has no hashes, so everything else is by name.
function findEntry(
	hash: number,
	name: string | undefined,
	context: PlugContext,
	catalog: EntryCatalog,
) {
	const byHash = pickBestEntry(catalog.entriesByHash.get(hash), context);
	if (byHash) return byHash;
	if (!name) return undefined;

	const byName = pickBestEntry(
		catalog.entriesByTitle.get(normalizeLookupName(name)),
		context,
	);
	if (byName) return byName;

	// "Enhanced Rampage" is the same perk as "Rampage", which is what the
	// Compendium names it.
	if (ENHANCED_PREFIX.test(name)) {
		return pickBestEntry(
			catalog.entriesByTitle.get(
				normalizeLookupName(name.replace(ENHANCED_PREFIX, "")),
			),
			context,
		);
	}

	return undefined;
}

function resolvePlug(
	hash: number,
	context: PlugContext,
	index: DimIndex,
	catalog: EntryCatalog,
): ResolvedPlug | null {
	const indexItem = index.items[String(hash)];
	const entry = findEntry(hash, indexItem?.n, context, catalog);

	if (entry) {
		return {
			hash,
			name: entry.title,
			iconPath: entry.iconPath ?? toBungieUrl(indexItem?.i),
			entryId: entry.id,
			count: 1,
		};
	}

	if (!indexItem) return null;

	return {
		hash,
		name: indexItem.n,
		iconPath: toBungieUrl(indexItem.i),
		fallbackDescription: indexItem.d
			? stripGlyphTokens(indexItem.d)
			: undefined,
		count: 1,
	};
}

// Collapses repeats into one plug with a count, keeping first-seen order.
function resolvePlugList(
	hashes: number[],
	context: PlugContext,
	index: DimIndex,
	catalog: EntryCatalog,
	unrecognized: Set<number>,
) {
	const plugs: ResolvedPlug[] = [];
	const plugByHash = new Map<number, ResolvedPlug>();

	for (const hash of hashes) {
		const existing = plugByHash.get(hash);
		if (existing) {
			existing.count += 1;
			continue;
		}

		const plug = resolvePlug(hash, context, index, catalog);
		if (!plug) {
			unrecognized.add(hash);
			continue;
		}

		plugs.push(plug);
		plugByHash.set(hash, plug);
	}

	return plugs;
}

// Socket overrides are keyed by socket index, which is the order the game
// shows the sockets in.
function overrideHashesInSocketOrder(item: DimLoadoutItem) {
	return Object.entries(item.socketOverrides ?? {})
		.sort(
			([leftSocket], [rightSocket]) => Number(leftSocket) - Number(rightSocket),
		)
		.map(([, plugHash]) => plugHash);
}

type GearKind = "weapon" | "armor" | "other";

// What the clearest evidence says an item is: the gear table first, then the
// community sources' own label for an exotic's perks.
function classifyByHash(
	hash: number,
	index: DimIndex,
	catalog: EntryCatalog,
): GearKind | null {
	const gear = index.gear[String(hash)];
	if (gear) return gear.t === "w" ? "weapon" : "armor";

	for (const entry of catalog.entriesByHash.get(hash) ?? []) {
		for (const sourceRef of entry.sourceRefs ?? []) {
			if (sourceRef.itemHash !== hash) continue;
			if (sourceRef.type?.startsWith("Weapon")) return "weapon";
			if (sourceRef.type?.startsWith("Armor")) return "armor";
		}
	}

	return null;
}

// For an item no table knows: its perks give it away, since a weapon's are
// weapon perks and an armor piece's are armor mods.
function classifyByPlugs(
	plugs: ResolvedPlug[],
	catalog: EntryCatalog,
): GearKind {
	for (const plug of plugs) {
		const entry = plug.entryId
			? catalog.entryById.get(plug.entryId)
			: undefined;
		if (!entry) continue;
		if (isWeaponPerkEntry(entry)) return "weapon";
		if (isArmorModEntry(entry) || entry.kind === "armor_set_bonus") {
			return "armor";
		}
	}
	return "other";
}

// Entries that describe the item itself rather than a plug: an exotic's
// intrinsic. A catalyst is left out, since a loadout cannot say whether the
// player has finished it.
function findItemEntryIds(
	hash: number,
	plugs: ResolvedPlug[],
	catalog: EntryCatalog,
) {
	const plugEntryIds = new Set(plugs.map((plug) => plug.entryId));

	return (catalog.entriesByHash.get(hash) ?? [])
		.filter((entry) => {
			if (plugEntryIds.has(entry.id)) return false;
			return !(entry.sourceRefs ?? []).some((ref) =>
				ref.type?.includes("Catalyst"),
			);
		})
		.map((entry) => entry.id);
}

function resolveItem(
	item: DimLoadoutItem,
	isEquipped: boolean,
	index: DimIndex,
	catalog: EntryCatalog,
	unrecognized: Set<number>,
): { kind: GearKind; item: ResolvedItem } {
	const hashKey = String(item.hash);
	const gear = index.gear[hashKey];
	const indexItem = index.items[hashKey];

	const knownKind = classifyByHash(item.hash, index, catalog);
	const plugContext: PlugContext =
		knownKind === "weapon"
			? { kind: "weapon" }
			: knownKind === "armor"
				? { kind: "armor" }
				: { kind: "unknown" };

	const plugs = resolvePlugList(
		overrideHashesInSocketOrder(item),
		plugContext,
		index,
		catalog,
		unrecognized,
	);
	const kind = knownKind ?? classifyByPlugs(plugs, catalog);

	const name = gear?.n ?? indexItem?.n;
	if (!name) unrecognized.add(item.hash);

	return {
		kind,
		item: {
			hash: item.hash,
			name,
			iconPath: toBungieUrl(gear?.i ?? indexItem?.i),
			tierLabel: gear ? TIER_LABELS[gear.tt] : undefined,
			isEquipped,
			entryIds: findItemEntryIds(item.hash, plugs, catalog),
			plugs,
		},
	};
}

function resolveSubclass(
	item: DimLoadoutItem,
	index: DimIndex,
	catalog: EntryCatalog,
	unrecognized: Set<number>,
): ResolvedSubclass | null {
	const subclass = index.subclasses[String(item.hash)];
	if (!subclass) return null;

	const element = ELEMENT_NAME_BY_TOKEN[subclass.el] ?? subclass.el;
	const context: PlugContext = { kind: "subclass", element };

	const hashesBySlot = new Map<SubclassSlotId | "other", number[]>();
	for (const plugHash of overrideHashesInSocketOrder(item)) {
		const slotId = index.options[String(plugHash)] ?? "other";
		const hashes = hashesBySlot.get(slotId) ?? [];
		hashes.push(plugHash);
		hashesBySlot.set(slotId, hashes);
	}

	const slotOrder: (SubclassSlotId | "other")[] = [
		...SUBCLASS_SLOT_IDS,
		"other",
	];
	const slots: ResolvedSubclassSlot[] = [];

	for (const slotId of slotOrder) {
		const hashes = hashesBySlot.get(slotId);
		if (!hashes) continue;

		const plugs = resolvePlugList(
			hashes,
			context,
			index,
			catalog,
			unrecognized,
		);
		if (plugs.length === 0) continue;

		slots.push({
			id: slotId,
			label: slotId === "other" ? "Other" : SLOT_LABELS[slotId],
			plugs,
		});
	}

	return {
		hash: item.hash,
		name: subclass.n,
		iconPath: toBungieUrl(subclass.i),
		element,
		className: CLASS_NAMES[subclass.ct] ?? "Any class",
		slots,
	};
}

function resolveSetBonuses(
	setBonuses: Record<string, number>,
	index: DimIndex,
	catalog: EntryCatalog,
) {
	const resolved: ResolvedSetBonus[] = [];

	for (const [setHash, pieceCount] of Object.entries(setBonuses)) {
		const set = index.sets[setHash];
		if (!set) continue;

		// A 4 piece build gets the 2 piece bonus as well.
		const plugs: ResolvedPlug[] = [];
		for (const setPerk of set.sp) {
			if (setPerk.c > pieceCount) continue;

			const entry = catalog.setBonusEntries.get(
				toSetBonusKey(set.n, setPerk.c),
			);
			if (!entry) continue;

			plugs.push({
				hash: setPerk.h,
				name: entry.title,
				iconPath: entry.iconPath,
				entryId: entry.id,
				count: 1,
			});
		}

		if (plugs.length > 0) {
			resolved.push({ setName: set.n, pieceCount, plugs });
		}
	}

	return resolved;
}

export function resolveBuild(
	loadout: DimLoadout,
	index: DimIndex,
	catalog: EntryCatalog,
): ResolvedBuild {
	const unrecognized = new Set<number>();
	const parameters = loadout.parameters;

	let subclass: ResolvedSubclass | undefined;
	const weapons: ResolvedItem[] = [];
	const armor: ResolvedItem[] = [];
	const otherItems: ResolvedItem[] = [];

	const listedItems = [
		...loadout.equipped.map((item) => ({ item, isEquipped: true })),
		...loadout.unequipped.map((item) => ({ item, isEquipped: false })),
	];

	for (const { item, isEquipped } of listedItems) {
		if (!subclass) {
			const resolvedSubclass = resolveSubclass(
				item,
				index,
				catalog,
				unrecognized,
			);
			if (resolvedSubclass) {
				subclass = resolvedSubclass;
				continue;
			}
		}

		const resolved = resolveItem(
			item,
			isEquipped,
			index,
			catalog,
			unrecognized,
		);
		if (resolved.kind === "weapon") weapons.push(resolved.item);
		else if (resolved.kind === "armor") armor.push(resolved.item);
		else otherItems.push(resolved.item);
	}

	return {
		name: loadout.name?.trim() || "Untitled build",
		className:
			loadout.classType === undefined
				? undefined
				: CLASS_NAMES[loadout.classType],
		notes: loadout.notes?.trim() ?? "",
		subclass,
		weapons,
		armor,
		otherItems,
		armorMods: resolvePlugList(
			parameters?.mods ?? [],
			{ kind: "armor-mod" },
			index,
			catalog,
			unrecognized,
		),
		armorPerks: resolvePlugList(
			parameters?.perks ?? [],
			{ kind: "exotic-perk" },
			index,
			catalog,
			unrecognized,
		),
		setBonuses: resolveSetBonuses(parameters?.setBonuses ?? {}, index, catalog),
		artifactPerks: resolvePlugList(
			parameters?.artifactUnlocks?.unlockedItemHashes ?? [],
			{ kind: "artifact" },
			index,
			catalog,
			unrecognized,
		),
		unrecognizedHashes: [...unrecognized],
	};
}

function collectPlugEntryIds(plugs: ResolvedPlug[]) {
	return plugs.flatMap((plug) => (plug.entryId ? [plug.entryId] : []));
}

// Every glossary entry the build shows, in the order it shows them.
export function collectBuildEntryIds(build: ResolvedBuild) {
	const ids: string[] = [];

	for (const slot of build.subclass?.slots ?? []) {
		ids.push(...collectPlugEntryIds(slot.plugs));
	}
	for (const item of [...build.weapons, ...build.armor, ...build.otherItems]) {
		ids.push(...item.entryIds, ...collectPlugEntryIds(item.plugs));
	}
	ids.push(
		...collectPlugEntryIds(build.armorMods),
		...collectPlugEntryIds(build.armorPerks),
		...build.setBonuses.flatMap((bonus) => collectPlugEntryIds(bonus.plugs)),
		...collectPlugEntryIds(build.artifactPerks),
	);

	return [...new Set(ids)];
}

export type ReferencedEffect = {
	entryId: string;
	// How many of the build's entries mention it.
	mentionCount: number;
};

// The entries a build's descriptions point at - Scorch, Weaken, Woven Mail -
// that the build does not already show, most mentioned first. This is the same
// one hop a keyword hover resolves, laid out in full.
export function collectReferencedEffects(
	buildEntryIds: string[],
	catalog: EntryCatalog,
): ReferencedEffect[] {
	const shownIds = new Set(buildEntryIds);
	const mentionCounts = new Map<string, number>();

	for (const entryId of buildEntryIds) {
		const entry = catalog.entryById.get(entryId);
		if (!entry) continue;

		const annotations = [
			...entry.annotations,
			...(entry.officialAnnotations ?? []),
			...(entry.alternateDescriptions ?? []).flatMap(
				(alternate) => alternate.annotations,
			),
		];

		// One mention per entry, however many times its text repeats the word.
		const referencedIds = new Set<string>();
		for (const annotation of annotations) {
			const keyword = catalog.keywordById.get(annotation.keywordId);
			if (!keyword) continue;

			const targetId = keyword.references.find((candidateId) =>
				catalog.entryById.has(candidateId),
			);
			if (targetId && !shownIds.has(targetId)) referencedIds.add(targetId);
		}

		for (const referencedId of referencedIds) {
			mentionCounts.set(
				referencedId,
				(mentionCounts.get(referencedId) ?? 0) + 1,
			);
		}
	}

	return [...mentionCounts.entries()]
		.map(([entryId, mentionCount]) => ({ entryId, mentionCount }))
		.sort(
			(left, right) =>
				right.mentionCount - left.mentionCount ||
				(catalog.entryById.get(left.entryId)?.title ?? "").localeCompare(
					catalog.entryById.get(right.entryId)?.title ?? "",
				),
		);
}
