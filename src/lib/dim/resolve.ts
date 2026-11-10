import {
	ELEMENT_NAME_BY_TOKEN,
	SUBCLASS_SLOT_IDS,
	type SubclassSlotId,
} from "@/lib/bungie/subclass-schema";
import type { AnnotatedEntry } from "@/lib/compendium/model";
import { SLOT_LABELS } from "@/lib/compendium/subclasses";
import { cleanupDescriptionText, normalizeLookupName } from "@/lib/utils/text";

import { type EntryCatalog, toSetBonusKey } from "./catalog";
import { type DimIndex, type DimIndexItem, toBungieUrl } from "./index-schema";
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
	// The entry that documents this plug: a glossary entry when the community
	// sources cover it, otherwise one of the build's own `manifestEntries`.
	entryId: string;
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
	// Entries made for plugs only the Bungie manifest knows, so they carry the
	// in-game text and nothing from the community sources. They are not in the
	// glossary, so whatever renders the build has to add them to its entry map.
	manifestEntries: AnnotatedEntry[];
	// Hashes the site could not name at all. Mostly shaders and ornaments.
	unrecognizedHashes: number[];
};

// What every step of resolving a build reads and adds to.
type ResolveEnv = {
	index: DimIndex;
	catalog: EntryCatalog;
	unrecognized: Set<number>;
	manifestEntries: Map<string, AnnotatedEntry>;
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

const NO_DESCRIPTION_TEXT = "The game data has no description for this.";

// An entry for a plug the community sources do not cover, so it still gets an
// icon, a hover card and a place in the page's grids like any other.
function buildManifestEntry(hash: number, item: DimIndexItem): AnnotatedEntry {
	const description = item.d ? stripGlyphTokens(item.d) : "";

	return {
		id: `manifest:${String(hash)}`,
		tab: "Bungie manifest",
		section: null,
		groups: [],
		source: { tab: "bungie", row: 0, column: 0 },
		title: item.n,
		description: "",
		officialDescription: description || NO_DESCRIPTION_TEXT,
		officialAnnotations: [],
		kind: "general",
		sourceId: "bungie",
		iconPath: toBungieUrl(item.i),
		itemHash: hash,
		annotations: [],
	};
}

function resolvePlug(
	hash: number,
	context: PlugContext,
	env: ResolveEnv,
): ResolvedPlug | null {
	const indexItem = env.index.items[String(hash)];
	const entry = findEntry(hash, indexItem?.n, context, env.catalog);

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

	const manifestEntry = buildManifestEntry(hash, indexItem);
	env.manifestEntries.set(manifestEntry.id, manifestEntry);

	return {
		hash,
		name: indexItem.n,
		iconPath: manifestEntry.iconPath,
		entryId: manifestEntry.id,
		count: 1,
	};
}

// Collapses repeats into one plug with a count, keeping first-seen order.
function resolvePlugList(
	hashes: number[],
	context: PlugContext,
	env: ResolveEnv,
) {
	const plugs: ResolvedPlug[] = [];
	const plugByHash = new Map<number, ResolvedPlug>();

	for (const hash of hashes) {
		const existing = plugByHash.get(hash);
		if (existing) {
			existing.count += 1;
			continue;
		}

		const plug = resolvePlug(hash, context, env);
		if (!plug) {
			env.unrecognized.add(hash);
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
function classifyByHash(hash: number, env: ResolveEnv): GearKind | null {
	const gear = env.index.gear[String(hash)];
	if (gear) return gear.t === "w" ? "weapon" : "armor";

	for (const entry of env.catalog.entriesByHash.get(hash) ?? []) {
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
function classifyByPlugs(plugs: ResolvedPlug[], env: ResolveEnv): GearKind {
	for (const plug of plugs) {
		const entry = env.catalog.entryById.get(plug.entryId);
		if (!entry) continue;
		if (isWeaponPerkEntry(entry)) return "weapon";
		if (isArmorModEntry(entry) || entry.kind === "armor_set_bonus") {
			return "armor";
		}
	}
	return "other";
}

// The community sources' labels for what an entry tied to an item is.
const INTRINSIC_ENTRY_TYPES = new Set([
	"Weapon Frame Exotic",
	"Armor Trait Exotic",
]);

function getItemRefType(entry: AnnotatedEntry, itemHash: number) {
	return (entry.sourceRefs ?? []).find((ref) => ref.itemHash === itemHash)
		?.type;
}

// Entries that describe the item itself rather than a plug someone picked: an
// exotic's intrinsic, and its fixed traits.
//
// Clarity ties every perk an exotic can roll to the item, so an exotic with a
// choice of traits would list all of them here, picked or not. A kind of perk
// with one candidate is fixed and always on; with several, the build's own
// socket overrides already say which was picked, so none are added. A catalyst
// is left out, since a loadout cannot say whether the player has finished it.
function findItemEntryIds(
	hash: number,
	plugs: ResolvedPlug[],
	env: ResolveEnv,
) {
	const plugEntryIds = new Set(plugs.map((plug) => plug.entryId));
	const candidatesByType = new Map<string, AnnotatedEntry[]>();

	for (const entry of env.catalog.entriesByHash.get(hash) ?? []) {
		const type = getItemRefType(entry, hash);
		if (!type || type.includes("Catalyst")) continue;
		if (plugEntryIds.has(entry.id)) continue;

		const candidates = candidatesByType.get(type) ?? [];
		candidates.push(entry);
		candidatesByType.set(type, candidates);
	}

	const entryIds: string[] = [];
	for (const [type, candidates] of candidatesByType) {
		const isAlwaysOn =
			INTRINSIC_ENTRY_TYPES.has(type) || candidates.length === 1;
		if (isAlwaysOn) entryIds.push(...candidates.map((entry) => entry.id));
	}

	return entryIds;
}

function resolveItem(
	item: DimLoadoutItem,
	isEquipped: boolean,
	env: ResolveEnv,
): { kind: GearKind; item: ResolvedItem } {
	const hashKey = String(item.hash);
	const gear = env.index.gear[hashKey];
	const indexItem = env.index.items[hashKey];

	const knownKind = classifyByHash(item.hash, env);
	const plugContext: PlugContext =
		knownKind === "weapon"
			? { kind: "weapon" }
			: knownKind === "armor"
				? { kind: "armor" }
				: { kind: "unknown" };

	const plugs = resolvePlugList(
		overrideHashesInSocketOrder(item),
		plugContext,
		env,
	);
	const kind = knownKind ?? classifyByPlugs(plugs, env);

	const name = gear?.n ?? indexItem?.n;
	if (!name) env.unrecognized.add(item.hash);

	return {
		kind,
		item: {
			hash: item.hash,
			name,
			iconPath: toBungieUrl(gear?.i ?? indexItem?.i),
			tierLabel: gear ? TIER_LABELS[gear.tt] : undefined,
			isEquipped,
			entryIds: findItemEntryIds(item.hash, plugs, env),
			plugs,
		},
	};
}

function resolveSubclass(
	item: DimLoadoutItem,
	env: ResolveEnv,
): ResolvedSubclass | null {
	const subclass = env.index.subclasses[String(item.hash)];
	if (!subclass) return null;

	const element = ELEMENT_NAME_BY_TOKEN[subclass.el] ?? subclass.el;
	const context: PlugContext = { kind: "subclass", element };

	const hashesBySlot = new Map<SubclassSlotId | "other", number[]>();
	for (const plugHash of overrideHashesInSocketOrder(item)) {
		const slotId = env.index.options[String(plugHash)] ?? "other";
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

		const plugs = resolvePlugList(hashes, context, env);
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

// How many pieces of each armor set the build wears. A loadout built in the
// optimizer also states the counts it was aiming for, which stand in when the
// equipped pieces are not in the gear table yet.
function countSetPieces(loadout: DimLoadout, env: ResolveEnv) {
	const counts = new Map<string, number>();

	for (const item of loadout.equipped) {
		const setHash = env.index.gear[String(item.hash)]?.sh;
		if (setHash === undefined) continue;
		counts.set(String(setHash), (counts.get(String(setHash)) ?? 0) + 1);
	}

	for (const [setHash, wantedCount] of Object.entries(
		loadout.parameters?.setBonuses ?? {},
	)) {
		counts.set(setHash, Math.max(counts.get(setHash) ?? 0, wantedCount));
	}

	return counts;
}

function resolveSetBonuses(loadout: DimLoadout, env: ResolveEnv) {
	const resolved: ResolvedSetBonus[] = [];

	for (const [setHash, pieceCount] of countSetPieces(loadout, env)) {
		const set = env.index.sets[setHash];
		if (!set) continue;

		// Four pieces get the two piece bonus as well.
		const plugs: ResolvedPlug[] = [];
		for (const setPerk of set.sp) {
			if (setPerk.c > pieceCount) continue;

			const entry = env.catalog.setBonusEntries.get(
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

	return resolved.sort((left, right) => right.pieceCount - left.pieceCount);
}

export function resolveBuild(
	loadout: DimLoadout,
	index: DimIndex,
	catalog: EntryCatalog,
): ResolvedBuild {
	const env: ResolveEnv = {
		index,
		catalog,
		unrecognized: new Set(),
		manifestEntries: new Map(),
	};
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
			const resolvedSubclass = resolveSubclass(item, env);
			if (resolvedSubclass) {
				subclass = resolvedSubclass;
				continue;
			}
		}

		const resolved = resolveItem(item, isEquipped, env);
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
			env,
		),
		armorPerks: resolvePlugList(
			parameters?.perks ?? [],
			{ kind: "exotic-perk" },
			env,
		),
		setBonuses: resolveSetBonuses(loadout, env),
		artifactPerks: resolvePlugList(
			parameters?.artifactUnlocks?.unlockedItemHashes ?? [],
			{ kind: "artifact" },
			env,
		),
		manifestEntries: [...env.manifestEntries.values()],
		unrecognizedHashes: [...env.unrecognized],
	};
}

function collectPlugEntryIds(plugs: ResolvedPlug[]) {
	return plugs.map((plug) => plug.entryId);
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
