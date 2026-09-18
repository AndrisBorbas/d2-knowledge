export type SheetColorRun = {
	start: number;
	end: number;
	color?: string;
};

export type SheetColorCell = {
	text: string;
	runs: SheetColorRun[];
};

export type SheetColorIndex = Map<string, SheetColorCell>;

// Rows and columns the sheet's author hid, by hand or through a filter. They
// hold superseded text (old versions of an ability, last season's mods) that
// the published sheet does not show and neither should the site.
export type SheetHidden = {
	rows: number[];
	columns: number[];
};

// A merged range, end-exclusive, the way the API reports it. The grid only
// carries a merged cell's text in its top left corner, so without these a
// value spanning five columns reads as one value beside four blanks.
export type SheetMerge = {
	startRow: number;
	endRow: number;
	startColumn: number;
	endColumn: number;
};

export function sheetColorKey(tab: string, row: number, column: number) {
	return `${tab}:${row}:${column}`;
}

function rgbToCss(color: { red?: number; green?: number; blue?: number }) {
	const r = Math.round((color.red ?? 0) * 255);
	const g = Math.round((color.green ?? 0) * 255);
	const b = Math.round((color.blue ?? 0) * 255);
	return `rgb(${r}, ${g}, ${b})`;
}

type SheetsApiTextFormatRun = {
	startIndex?: number;
	format?: {
		foregroundColor?: { red?: number; green?: number; blue?: number };
	};
};

type SheetsApiCellData = {
	formattedValue?: string;
	textFormatRuns?: SheetsApiTextFormatRun[];
};

function buildRuns(cell: SheetsApiCellData | undefined): SheetColorRun[] {
	const text = cell?.formattedValue ?? "";
	const formatRuns = cell?.textFormatRuns ?? [];
	if (formatRuns.length === 0) return [];

	return formatRuns.map((run, index) => {
		const start = run.startIndex ?? 0;
		const next = formatRuns[index + 1];
		const end = next ? (next.startIndex ?? text.length) : text.length;
		const foregroundColor = run.format?.foregroundColor;
		return {
			start,
			end,
			color: foregroundColor ? rgbToCss(foregroundColor) : undefined,
		};
	});
}

export type SheetFetchResult = {
	grid: Record<string, string[][]>;
	colors: SheetColorIndex;
	// Tab title -> gid. Recorded so a snapshot can assert it still points at the
	// tab it was written against: a renamed tab silently returns nothing.
	tabIds: Record<string, number>;
	merges: Record<string, SheetMerge[]>;
	hidden: Record<string, SheetHidden>;
};

type SheetsApiDimensionMetadata = {
	hiddenByUser?: boolean;
	hiddenByFilter?: boolean;
};

function hiddenIndices(metadata: SheetsApiDimensionMetadata[] | undefined) {
	return (metadata ?? []).flatMap((entry, index) =>
		entry.hiddenByUser || entry.hiddenByFilter ? [index] : [],
	);
}

export async function fetchSheetTabsWithColors(
	sheetId: string,
	tabs: string[],
	apiKey: string,
): Promise<SheetFetchResult> {
	const params = new URLSearchParams();
	for (const tab of tabs) params.append("ranges", tab);
	params.set(
		"fields",
		"sheets(properties(title,sheetId),merges,data(rowData.values(formattedValue,textFormatRuns),rowMetadata(hiddenByUser,hiddenByFilter),columnMetadata(hiddenByUser,hiddenByFilter)))",
	);
	params.set("key", apiKey);

	const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?${params.toString()}`;
	const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}

	const json = (await res.json()) as {
		sheets?: {
			properties?: { title?: string; sheetId?: number };
			merges?: {
				startRowIndex?: number;
				endRowIndex?: number;
				startColumnIndex?: number;
				endColumnIndex?: number;
			}[];
			data?: {
				rowData?: { values?: SheetsApiCellData[] }[];
				rowMetadata?: SheetsApiDimensionMetadata[];
				columnMetadata?: SheetsApiDimensionMetadata[];
			}[];
		}[];
	};

	const grid: Record<string, string[][]> = {};
	const colors: SheetColorIndex = new Map();
	const tabIds: Record<string, number> = {};
	const merges: Record<string, SheetMerge[]> = {};
	const hidden: Record<string, SheetHidden> = {};

	for (const sheet of json.sheets ?? []) {
		const tabName = sheet.properties?.title;
		if (!tabName) continue;
		if (typeof sheet.properties?.sheetId === "number") {
			tabIds[tabName] = sheet.properties.sheetId;
		}
		merges[tabName] = (sheet.merges ?? []).map((merge) => ({
			startRow: merge.startRowIndex ?? 0,
			endRow: merge.endRowIndex ?? 0,
			startColumn: merge.startColumnIndex ?? 0,
			endColumn: merge.endColumnIndex ?? 0,
		}));

		hidden[tabName] = {
			rows: hiddenIndices(sheet.data?.[0]?.rowMetadata),
			columns: hiddenIndices(sheet.data?.[0]?.columnMetadata),
		};

		const rowData = sheet.data?.[0]?.rowData ?? [];
		const rows: string[][] = [];

		for (let r = 0; r < rowData.length; r++) {
			const values = rowData[r]?.values ?? [];
			const rowStrings: string[] = [];

			for (let c = 0; c < values.length; c++) {
				const cell = values[c];
				const text = cell?.formattedValue ?? "";
				rowStrings.push(text);

				const runs = buildRuns(cell);
				if (runs.some((run) => run.color)) {
					colors.set(sheetColorKey(tabName, r, c), { text, runs });
				}
			}

			rows.push(rowStrings);
		}

		grid[tabName] = rows;
	}

	return { grid, colors, tabIds, merges, hidden };
}
