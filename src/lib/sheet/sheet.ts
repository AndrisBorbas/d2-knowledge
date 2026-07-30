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
	format?: { foregroundColor?: { red?: number; green?: number; blue?: number } };
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

export async function fetchSheetTabsWithColors(
	sheetId: string,
	tabs: string[],
	apiKey: string,
): Promise<{ grid: Record<string, string[][]>; colors: SheetColorIndex }> {
	const params = new URLSearchParams();
	for (const tab of tabs) params.append("ranges", tab);
	params.set(
		"fields",
		"sheets(properties.title,data.rowData.values(formattedValue,textFormatRuns))",
	);
	params.set("key", apiKey);

	const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?${params.toString()}`;
	const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}

	const json = (await res.json()) as {
		sheets?: {
			properties?: { title?: string };
			data?: { rowData?: { values?: SheetsApiCellData[] }[] }[];
		}[];
	};

	const grid: Record<string, string[][]> = {};
	const colors: SheetColorIndex = new Map();

	for (const sheet of json.sheets ?? []) {
		const tabName = sheet.properties?.title;
		if (!tabName) continue;

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

	return { grid, colors };
}
