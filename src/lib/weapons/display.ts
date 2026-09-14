import type {
	DamageShotRow,
	NumericCell,
	SymbolRating,
	TierRank,
} from "./model";

// Tailwind only ships classes it can see as literal strings, so the rank
// palette is spelled out rather than built from the letter.
export const RANK_TEXT_CLASS: Record<TierRank, string> = {
	S: "text-rank-s",
	A: "text-rank-a",
	B: "text-rank-b",
	C: "text-rank-c",
	D: "text-rank-d",
	E: "text-rank-e",
	F: "text-rank-f",
};

export const RANK_BADGE_CLASS: Record<TierRank, string> = {
	S: "border-rank-s/50 bg-rank-s/15 text-rank-s",
	A: "border-rank-a/50 bg-rank-a/15 text-rank-a",
	B: "border-rank-b/50 bg-rank-b/15 text-rank-b",
	C: "border-rank-c/50 bg-rank-c/15 text-rank-c",
	D: "border-rank-d/50 bg-rank-d/15 text-rank-d",
	E: "border-rank-e/50 bg-rank-e/15 text-rank-e",
	F: "border-rank-f/50 bg-rank-f/15 text-rank-f",
};

export const ENERGY_TEXT_CLASS: Record<string, string> = {
	Kinetic: "text-white/70",
	Arc: "text-arc",
	Solar: "text-solar",
	Void: "text-void",
	Stasis: "text-stasis",
	Strand: "text-strand",
};

export const SYMBOL_GLYPH: Record<SymbolRating, string> = {
	yes: "✔",
	partial: "▲",
	situational: "!",
	no: "✖",
};

export const SYMBOL_CLASS: Record<SymbolRating, string> = {
	yes: "text-emerald-300",
	partial: "text-amber-300",
	situational: "text-sky-300",
	no: "text-white/30",
};

// The sheets already formatted every number the way they want it read, commas
// and "INF" included, so print that and keep the parsed value for sorting.
export function formatCell(cell: NumericCell | undefined) {
	if (!cell || cell.raw.length === 0) return "-";
	return cell.raw;
}

export function cellSortValue(cell: NumericCell | undefined) {
	return cell?.value ?? Number.NEGATIVE_INFINITY;
}

// The damage tab divides a wipe total by the sheet's own `#` and by the buffs
// that were up, so what it prints is damage per measured shot. `#` is an honest
// shot count wherever it is above one, and those rows are averages rather than
// single readings.
//
// It is not a shot count on every row. Twenty-five tests fire a whole magazine
// or an Illegally Modded Holster rotation and still write `#` as 1, because one
// rotation is what was measured, and their value is tens of times larger for
// that reason rather than because the weapon hits harder. The sheet names those
// in its own conditions - "17 shots", "13 bursts", "full mag", a sword's
// "HLLHLLHLLHLLH" - so that wording is what separates them. Arithmetic on the
// value cannot: one trigger pull of Eyes of Tomorrow throws six rockets and
// comes out the same size as a full magazine of The Fourth Horseman.
const MULTI_SHOT_CONDITIONS = [
	/\b\d+\s*(shots?|bursts?|swings?)\b/i,
	/\ball three shots\b/i,
	/\bmag\b/i,
	/\bentire turret duration\b/i,
	// A sword combo, written as the order the swings were thrown in.
	/\b[HL]{4,}\b/,
	/\b\d+[HL]\d*[HL]\b/,
];

export function isPerShotRow(row: DamageShotRow) {
	// The sheet counted the shots it averaged over, so the value is per shot
	// however many projectiles or ticks one of those shots happened to land.
	const shots = row.shots.value;
	if (shots !== null && shots > 1) return true;

	return !MULTI_SHOT_CONDITIONS.some((pattern) =>
		pattern.test(row.modifiers ?? ""),
	);
}

// The healthbar measurement wherever the sheet made one, since it catches
// damage the floating numbers miss or double count, and the visual one
// otherwise.
export function measuredCell(row: DamageShotRow) {
	return row.healthbarValue.value === null
		? row.visualValue
		: row.healthbarValue;
}

export function formatSeason(season: number | null) {
	return season === null ? "-" : `S${String(season)}`;
}

export const TIER_ORDER: string[] = ["S", "A", "B", "C", "D", "E", "F"];

// The sheet's `#` rank only means anything inside its own tab, so a list
// spanning several tabs orders by tier and lets the rank break ties. Shared by
// the tier list and by the seed the page prerenders, so the rows on screen do
// not reshuffle when the full dataset arrives.
type SortableRow = {
	tier: TierRank | null;
	rank: number | null;
	// Absent on exotics, which come from a single tab and so need no tiebreak.
	categoryLabel?: string;
};

export function compareTierRows(left: SortableRow, right: SortableRow) {
	return (
		TIER_ORDER.indexOf(left.tier ?? "F") -
			TIER_ORDER.indexOf(right.tier ?? "F") ||
		(left.rank ?? Number.MAX_SAFE_INTEGER) -
			(right.rank ?? Number.MAX_SAFE_INTEGER) ||
		(left.categoryLabel ?? "").localeCompare(right.categoryLabel ?? "")
	);
}

// Tab names as the Status sheet writes them, so a view can say when what it is
// showing was last looked at.
export function statusForTab(
	status: { tab: string; updated: string; status?: string }[],
	tab: string,
) {
	return status.find((entry) => entry.tab === tab);
}
