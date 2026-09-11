import type { TabLayout } from "./config";

export type SheetRow = {
	// Absolute row index in the grid, kept so every parsed record can point back
	// at the cell it came from.
	index: number;
	get(header: string): string;
	cells: string[];
};

export type SheetTable = {
	tab: string;
	headers: string[];
	rows: SheetRow[];
	has(header: string): boolean;
};

function normalizeHeader(value: string) {
	return value.replace(/\s+/g, " ").trim();
}

// A merged banner only writes its leftmost cell, so carry it right across the
// blanks it covers.
function forwardFill(row: string[] | undefined, width: number) {
	const filled: string[] = [];
	let current = "";
	for (let index = 0; index < width; index++) {
		const value = normalizeHeader(row?.[index] ?? "");
		if (value) current = value;
		filled.push(current);
	}
	return filled;
}

// Several tabs repeat a header under different banners: the DPS sheet's
// `Weapons` tab has `Boss`, `#`, `Type` and `Full Modifiers` twice, once under
// VISUAL and once under HEALTHBAR. Reading those by bare name would silently
// pick whichever came last, so every occurrence of a repeated name gets
// qualified and the unique ones stay readable.
function buildHeaders(grid: string[][], layout: TabLayout) {
	const headerRow = grid[layout.headerRow] ?? [];
	const width = Math.max(
		headerRow.length,
		...grid.slice(layout.dataStartRow).map((row) => row.length),
		0,
	);

	const raw = Array.from({ length: width }, (_, index) =>
		normalizeHeader(headerRow[index] ?? ""),
	);
	const banners =
		layout.bannerRow === undefined
			? null
			: forwardFill(grid[layout.bannerRow], width);

	const counts = new Map<string, number>();
	for (const name of raw) {
		if (!name) continue;
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}

	return raw.map((name, index) => {
		if (!name) return "";
		if ((counts.get(name) ?? 0) < 2) return name;
		const banner = banners?.[index];
		return banner ? `${banner} / ${name}` : `${name} (${index})`;
	});
}

export function readTable(grid: string[][], layout: TabLayout): SheetTable {
	const headers = buildHeaders(grid, layout);
	const columnByHeader = new Map<string, number>();
	headers.forEach((header, index) => {
		if (header && !columnByHeader.has(header))
			columnByHeader.set(header, index);
	});

	const rows: SheetRow[] = [];
	for (let index = layout.dataStartRow; index < grid.length; index++) {
		const cells = grid[index] ?? [];
		// Sheets omits trailing empties, so a short row is normal and a row of
		// nothing but empties is a spacer.
		if (cells.every((cell) => cell.trim().length === 0)) continue;
		rows.push({
			index,
			cells,
			get(header: string) {
				const column = columnByHeader.get(header);
				if (column === undefined) return "";
				return cells[column] ?? "";
			},
		});
	}

	return {
		tab: layout.tab,
		headers,
		rows,
		has: (header: string) => columnByHeader.has(header),
	};
}

// Turns "Aegis renamed Mag to Magazine" into a build failure rather than a
// page of blanks.
export function assertHeaders(table: SheetTable, required: string[]) {
	const missing = required.filter((header) => !table.has(header));
	if (missing.length === 0) return;
	throw new Error(
		`Tab "${table.tab}" is missing expected columns: ${missing.join(", ")}.\nFound: ${table.headers.filter(Boolean).join(", ")}`,
	);
}

export function cellText(value: string) {
	return value.replace(/\r/g, "").trim();
}

export function cellLines(value: string) {
	return cellText(value)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export function cellFirstLine(value: string) {
	return cellLines(value)[0] ?? "";
}

export function cellOptional(value: string) {
	const text = cellText(value);
	return text.length > 0 ? text : undefined;
}

export function cellNumber(value: string): number | null {
	const text = cellText(value).replace(/[,\s]/g, "").replace(/%$/, "");
	if (text.length === 0) return null;
	const parsed = Number(text);
	return Number.isFinite(parsed) ? parsed : null;
}

export function cellInteger(value: string): number | null {
	const parsed = cellNumber(value);
	return parsed === null ? null : Math.round(parsed);
}

// The sheet writes "INF", "N/A", "26.83%" and "167,925", all of which a table
// should print exactly as written while still sorting numerically.
export type NumericCell = { raw: string; value: number | null };

export function cellNumeric(value: string): NumericCell {
	return { raw: cellText(value), value: cellNumber(value) };
}

export function cellBoolean(value: string): boolean | null {
	const text = cellText(value).toLowerCase();
	if (text === "yes" || text === "true") return true;
	if (text === "no" || text === "false") return false;
	return null;
}

export type SymbolRating = "yes" | "partial" | "situational" | "no";

const SYMBOL_RATINGS: Record<string, SymbolRating> = {
	"✔": "yes",
	"✓": "yes",
	"▲": "partial",
	"!": "situational",
	"✖": "no",
	"✗": "no",
};

export function cellSymbol(value: string): SymbolRating | null {
	return SYMBOL_RATINGS[cellText(value)] ?? null;
}
