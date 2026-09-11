import type { NumericCell, SymbolRating, TierRank } from "./model";

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

export function formatSeason(season: number | null) {
	return season === null ? "-" : `S${String(season)}`;
}

// Tab names as the Status sheet writes them, so a view can say when what it is
// showing was last looked at.
export function statusForTab(
	status: { tab: string; updated: string; status?: string }[],
	tab: string,
) {
	return status.find((entry) => entry.tab === tab);
}
