import type {
	AnnotatedEntry,
	CompendiumDataset,
	Keyword,
} from "@/lib/compendium/model";
import { normalizeLookupName } from "@/lib/utils/text";

// The compendium, indexed every way a DIM hash can reach an entry: by the item
// and perk hashes the community sources carry, by title for the Compendium
// sheet (which has no hashes at all), and by armor set name for set bonuses.
export type EntryCatalog = {
	entryById: Map<string, AnnotatedEntry>;
	keywordById: Map<string, Keyword>;
	entriesByHash: Map<number, AnnotatedEntry[]>;
	entriesByTitle: Map<string, AnnotatedEntry[]>;
	// "<normalized set name>|<piece count>" -> the bonus unlocked at that count.
	setBonusEntries: Map<string, AnnotatedEntry>;
};

const SET_PIECE_COUNT_PATTERN = /^(\d+)\s*Piece/i;

export function toSetBonusKey(setName: string, pieceCount: number) {
	return `${normalizeLookupName(setName)}|${String(pieceCount)}`;
}

function collectEntryHashes(entry: AnnotatedEntry) {
	const hashes = new Set<number>();

	if (entry.perkHash !== undefined) hashes.add(entry.perkHash);
	if (entry.itemHash !== undefined) hashes.add(entry.itemHash);

	for (const sourceRef of entry.sourceRefs ?? []) {
		if (sourceRef.hash !== undefined) hashes.add(sourceRef.hash);
		if (sourceRef.itemHash !== undefined) hashes.add(sourceRef.itemHash);
	}

	return hashes;
}

function pushTo<Key>(
	map: Map<Key, AnnotatedEntry[]>,
	key: Key,
	entry: AnnotatedEntry,
) {
	const entries = map.get(key);
	if (entries) {
		entries.push(entry);
	} else {
		map.set(key, [entry]);
	}
}

export function buildEntryCatalog(dataset: CompendiumDataset): EntryCatalog {
	const entryById = new Map<string, AnnotatedEntry>();
	const entriesByHash = new Map<number, AnnotatedEntry[]>();
	const entriesByTitle = new Map<string, AnnotatedEntry[]>();
	const setBonusEntries = new Map<string, AnnotatedEntry>();

	for (const entry of dataset.entries) {
		entryById.set(entry.id, entry);

		for (const hash of collectEntryHashes(entry)) {
			pushTo(entriesByHash, hash, entry);
		}

		const titleKey = normalizeLookupName(entry.title);
		if (titleKey) pushTo(entriesByTitle, titleKey, entry);

		if (entry.kind === "armor_set_bonus" && entry.secondaryName) {
			const pieceCount = SET_PIECE_COUNT_PATTERN.exec(entry.extraInfo ?? "");
			if (pieceCount) {
				const key = toSetBonusKey(entry.secondaryName, Number(pieceCount[1]));
				if (!setBonusEntries.has(key)) setBonusEntries.set(key, entry);
			}
		}
	}

	return {
		entryById,
		keywordById: new Map(
			dataset.keywords.map((keyword) => [keyword.id, keyword]),
		),
		entriesByHash,
		entriesByTitle,
		setBonusEntries,
	};
}
