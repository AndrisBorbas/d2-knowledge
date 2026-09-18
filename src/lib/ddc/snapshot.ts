import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	fetchSheetTabsWithColors,
	type SheetColorCell,
	type SheetColorIndex,
	sheetColorKey,
	type SheetHidden,
	type SheetMerge,
} from "@/lib/sheets/api";

import { COMPENDIUM_ACTIVE_TAB_NAMES, COMPENDIUM_SHEET_ID } from "./config";

// The raw sheet as the API handed it over, before any normalization. Keeping
// the grid rather than the parsed tabs means a parser change is a recompile
// rather than another round trip to Google, and a build never depends on a
// third party spreadsheet being reachable.
export type DdcSheetSnapshot = {
	generatedAt: string;
	sheetId: string;
	// Tab title -> gid, so a renamed or replaced tab fails loudly instead of
	// quietly returning nothing.
	tabIds: Record<string, number>;
	grid: Record<string, string[][]>;
	// `SheetColorIndex` is a Map, which JSON cannot hold, so it travels as its
	// entry pairs and is rebuilt on read.
	colors: [string, SheetColorCell][];
	// Optional because snapshots taken before merges were recorded lack them;
	// readers fall back to guessing spans from the gaps between cells.
	merges?: Record<string, SheetMerge[]>;
	// The raw grid keeps hidden rows and columns so the snapshot stays a
	// faithful copy; they are blanked on read. Optional for the same reason as
	// `merges`, and an older snapshot shows everything.
	hidden?: Record<string, SheetHidden>;
};

export async function fetchDdcSheetSnapshot(): Promise<DdcSheetSnapshot> {
	const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY is not set");

	const { grid, colors, tabIds, merges, hidden } =
		await fetchSheetTabsWithColors(
			COMPENDIUM_SHEET_ID,
			COMPENDIUM_ACTIVE_TAB_NAMES,
			apiKey,
		);

	const missing = COMPENDIUM_ACTIVE_TAB_NAMES.filter(
		(tab) => (grid[tab]?.length ?? 0) === 0,
	);
	if (missing.length > 0) {
		throw new Error(
			`The Destiny Data Compendium returned no rows for: ${missing.join(", ")}. The tab was probably renamed.`,
		);
	}

	return {
		generatedAt: new Date().toISOString(),
		sheetId: COMPENDIUM_SHEET_ID,
		tabIds,
		grid,
		colors: [...colors.entries()],
		merges,
		hidden,
	};
}

type DdcSheetSource = {
	grid: Record<string, string[][]>;
	colors: SheetColorIndex;
	merges: Record<string, SheetMerge[]>;
};

// Blanks every cell the sheet hides, rather than dropping the rows, so row and
// column indices still line up with the sheet and with the color and merge
// indexes keyed by them. A blank row reads as a separator to every parser,
// which is what a hidden run of rows looks like on the published sheet.
function maskHiddenCells(snapshot: DdcSheetSnapshot): DdcSheetSource {
	const colors: SheetColorIndex = new Map(snapshot.colors);
	const merges: Record<string, SheetMerge[]> = {};
	const grid: Record<string, string[][]> = {};

	for (const [tab, rows] of Object.entries(snapshot.grid)) {
		const hiddenRows = new Set(snapshot.hidden?.[tab]?.rows);
		const hiddenColumns = new Set(snapshot.hidden?.[tab]?.columns);
		const isHidden = (row: number, column: number) =>
			hiddenRows.has(row) || hiddenColumns.has(column);

		grid[tab] = rows.map((cells, row) =>
			cells.map((text, column) => {
				if (!isHidden(row, column)) return text;
				colors.delete(sheetColorKey(tab, row, column));
				return "";
			}),
		);
		merges[tab] = (snapshot.merges?.[tab] ?? []).filter(
			(merge) => !isHidden(merge.startRow, merge.startColumn),
		);
	}

	return { grid, colors, merges };
}

async function readSnapshotFile(): Promise<DdcSheetSource> {
	// Literal segments, not a spread: Next traces filesystem access statically.
	const filePath = path.join(process.cwd(), "data", "ddc-sheet.json");

	let json: string;
	try {
		json = await readFile(filePath, "utf8");
	} catch (cause) {
		throw new Error(
			`No Destiny Data Compendium snapshot at ${filePath}. Run \`bun run data:ddc:snapshot\`.`,
			{ cause },
		);
	}

	const snapshot = JSON.parse(json) as DdcSheetSnapshot;
	if (snapshot.sheetId !== COMPENDIUM_SHEET_ID) {
		throw new Error(
			`${filePath} was taken from sheet ${snapshot.sheetId}, but the compendium reads ${COMPENDIUM_SHEET_ID}. Re-run \`bun run data:ddc:snapshot\`.`,
		);
	}

	return maskHiddenCells(snapshot);
}

// 3.5 MB of JSON that the manifest script alone asks for twice. One promise per
// process, the way `loadCompendiumDataset` keeps the compiled dataset.
let cachedSnapshot: Promise<DdcSheetSource> | null = null;

export function readDdcSheetSnapshot() {
	cachedSnapshot ??= readSnapshotFile().catch((error: unknown) => {
		cachedSnapshot = null;
		throw error;
	});
	return cachedSnapshot;
}
