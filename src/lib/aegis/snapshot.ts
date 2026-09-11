import { readFile } from "node:fs/promises";
import path from "node:path";

import { fetchSheetTabsWithColors } from "@/lib/sheets/api";

import {
	DPS_SHEET_ID,
	DPS_TABS,
	ENDGAME_SHEET_ID,
	ENDGAME_TABS,
	type TabLayout,
} from "./config";

// The raw grids, exactly as the API handed them over. Parsing happens at
// compile time against this file, so a parser fix never costs another fetch.
export type AegisSheetSnapshot = {
	generatedAt: string;
	sheetId: string;
	tabIds: Record<string, number>;
	grid: Record<string, string[][]>;
};

export type AegisSheetId = "endgame" | "dps";

const SHEETS: Record<
	AegisSheetId,
	{ sheetId: string; tabs: TabLayout[]; fileName: string; label: string }
> = {
	endgame: {
		sheetId: ENDGAME_SHEET_ID,
		tabs: ENDGAME_TABS,
		fileName: "aegis-endgame.json",
		label: "Endgame Analysis",
	},
	dps: {
		sheetId: DPS_SHEET_ID,
		tabs: DPS_TABS,
		fileName: "aegis-damage.json",
		label: "Boss DPS",
	},
};

function assertTabsIntact(
	label: string,
	tabs: TabLayout[],
	grid: Record<string, string[][]>,
	tabIds: Record<string, number>,
) {
	const problems: string[] = [];

	for (const layout of tabs) {
		const rows = grid[layout.tab];
		if (!rows || rows.length === 0) {
			problems.push(`"${layout.tab}" returned no rows (renamed?)`);
			continue;
		}
		if (rows.length < layout.minRows) {
			problems.push(
				`"${layout.tab}" has ${rows.length} rows, expected at least ${layout.minRows}`,
			);
		}
		const gid = tabIds[layout.tab];
		if (gid !== undefined && gid !== layout.gid) {
			problems.push(
				`"${layout.tab}" is gid ${gid}, expected ${layout.gid} (replaced?)`,
			);
		}
	}

	if (problems.length > 0) {
		throw new Error(
			`${label} sheet looks restructured:\n- ${problems.join("\n- ")}`,
		);
	}
}

export async function fetchAegisSheetSnapshot(
	id: AegisSheetId,
): Promise<AegisSheetSnapshot> {
	const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY is not set");

	const sheet = SHEETS[id];
	const { grid, tabIds } = await fetchSheetTabsWithColors(
		sheet.sheetId,
		sheet.tabs.map((layout) => layout.tab),
		apiKey,
	);

	assertTabsIntact(sheet.label, sheet.tabs, grid, tabIds);

	return {
		generatedAt: new Date().toISOString(),
		sheetId: sheet.sheetId,
		tabIds,
		grid,
	};
}

export function aegisSnapshotFileName(id: AegisSheetId) {
	return SHEETS[id].fileName;
}

async function readSnapshotFile(id: AegisSheetId) {
	const sheet = SHEETS[id];
	// Literal segments, not a spread: Next traces filesystem access statically.
	const filePath =
		id === "endgame"
			? path.join(process.cwd(), "data", "aegis-endgame.json")
			: path.join(process.cwd(), "data", "aegis-damage.json");

	let json: string;
	try {
		json = await readFile(filePath, "utf8");
	} catch (cause) {
		throw new Error(
			`No ${sheet.label} snapshot at ${filePath}. Run \`bun run data:aegis:snapshot\`.`,
			{ cause },
		);
	}

	const snapshot = JSON.parse(json) as AegisSheetSnapshot;
	if (snapshot.sheetId !== sheet.sheetId) {
		throw new Error(
			`${filePath} was taken from sheet ${snapshot.sheetId}, expected ${sheet.sheetId}. Re-run \`bun run data:aegis:snapshot\`.`,
		);
	}
	return snapshot;
}

const cache = new Map<AegisSheetId, Promise<AegisSheetSnapshot>>();

export function readAegisSheetSnapshot(id: AegisSheetId) {
	let pending = cache.get(id);
	if (!pending) {
		pending = readSnapshotFile(id).catch((error: unknown) => {
			cache.delete(id);
			throw error;
		});
		cache.set(id, pending);
	}
	return pending;
}
