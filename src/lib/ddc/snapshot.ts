import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	fetchSheetTabsWithColors,
	type SheetColorCell,
	type SheetColorIndex,
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
};

export async function fetchDdcSheetSnapshot(): Promise<DdcSheetSnapshot> {
	const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY is not set");

	const { grid, colors, tabIds } = await fetchSheetTabsWithColors(
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
	};
}

type DdcSheetSource = {
	grid: Record<string, string[][]>;
	colors: SheetColorIndex;
};

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

	return { grid: snapshot.grid, colors: new Map(snapshot.colors) };
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
