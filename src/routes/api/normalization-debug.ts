import {
	COMPENDIUM_SHEET_ID,
	COMPENDIUM_TAB_NORMALIZATION,
} from "~/lib/sheet/data";
import type { TabNormalizationRule } from "~/lib/sheet/normalize";
import {
	DEFAULT_TAB_NORMALIZATION_RULE,
	normalizeTabWithRule,
} from "~/lib/sheet/normalize";
import { fetchSheetTabs } from "~/lib/sheet/sheet";

function normalizeCell(value: string | undefined) {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function getNonEmptyCells(row: string[]) {
	const cells: Array<{ column: number; text: string }> = [];
	for (let col = 0; col < row.length; col++) {
		const text = normalizeCell(row[col]);
		if (text.length > 0) {
			cells.push({ column: col, text });
		}
	}
	return cells;
}

export const GET = async ({ request }: { request: Request }) => {
	try {
		const url = new URL(request.url);
		const tabName = url.searchParams.get("tab")?.trim();
		const includeEmptyRows = url.searchParams.get("includeEmpty") === "1";

		if (!tabName) {
			return new Response(
				JSON.stringify({
					error: "Missing required query param: tab",
					example: "/api/normalization-debug?tab=Arc",
				}),
				{
					status: 400,
					headers: { "content-type": "application/json; charset=utf-8" },
				},
			);
		}

		const raw = await fetchSheetTabs(COMPENDIUM_SHEET_ID, [tabName]);
		const rows = raw[tabName] ?? [];
		const rule: TabNormalizationRule =
			COMPENDIUM_TAB_NORMALIZATION[tabName] ?? DEFAULT_TAB_NORMALIZATION_RULE;

		const tab = normalizeTabWithRule(tabName, rows, rule);
		const entriesBySourceRow = new Map<number, typeof tab.entries>();
		for (const entry of tab.entries) {
			const list = entriesBySourceRow.get(entry.source.row) ?? [];
			list.push(entry);
			entriesBySourceRow.set(entry.source.row, list);
		}

		const rowDebug = rows
			.map((row, rowIndex) => {
				const nonEmptyCells = getNonEmptyCells(row);
				if (!includeEmptyRows && nonEmptyCells.length === 0) return null;
				const matchedEntries = entriesBySourceRow.get(rowIndex) ?? [];
				return {
					rowIndex,
					rowNumber: rowIndex + 1,
					nonEmptyCells,
					matchedEntries: matchedEntries.map((entry) => ({
						id: entry.id,
						title: entry.title,
						section: entry.section,
						sourceColumn: entry.source.column,
					})),
				};
			})
			.filter(Boolean);

		return new Response(
			JSON.stringify(
				{
					tabName,
					rule,
					rowCount: rows.length,
					entryCount: tab.entries.length,
					entries: tab.entries,
					rows: rowDebug,
				},
				null,
				2,
			),
			{
				status: 200,
				headers: {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store",
				},
			},
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		});
	}
};
