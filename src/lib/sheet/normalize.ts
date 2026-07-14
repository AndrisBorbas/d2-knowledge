import type { Entry, SourceSpan, TabData } from "./model";

export type RowSectionSelector = {
	mode: "single-cell";
	column?: number;
	maxLength?: number;
	minLength?: number;
	forbidSentenceEnding?: boolean;
};

export type PairedRowsRule = {
	strategy: "paired-rows";
	titleColumns?: number[];
	descriptionColumns?: number[];
	descriptionMatch?: "by-order" | "by-column";
	descriptionRowOffset?: number;
	maxTitleLength?: number;
	minDescriptionLength?: number;
	allowNoteRows?: boolean;
	noteMinLength?: number;
	section?: RowSectionSelector;
	startRow?: number;
	endRow?: number;
};

export type SameRowRule = {
	strategy: "same-row";
	titleColumn: number;
	descriptionColumn: number;
	minDescriptionLength?: number;
	maxTitleLength?: number;
	allowNoteRows?: boolean;
	noteMinLength?: number;
	section?: RowSectionSelector;
	startRow?: number;
	endRow?: number;
};

export type TabNormalizationRule = PairedRowsRule | SameRowRule;

export type TabNormalizationConfigMap = Partial<
	Record<string, TabNormalizationRule>
>;

export const DEFAULT_TAB_NORMALIZATION_RULE: TabNormalizationRule = {
	strategy: "paired-rows",
	descriptionMatch: "by-order",
	descriptionRowOffset: 1,
	maxTitleLength: 64,
	minDescriptionLength: 20,
	allowNoteRows: true,
	noteMinLength: 20,
	section: {
		mode: "single-cell",
		maxLength: 64,
		minLength: 2,
		forbidSentenceEnding: true,
	},
};

function normalizeCell(value: string | undefined) {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function getNonEmptyCells(row: string[]) {
	const cells: { column: number; text: string }[] = [];
	for (let col = 0; col < row.length; col++) {
		const text = normalizeCell(row[col]);
		if (text.length > 0) {
			cells.push({ column: col, text });
		}
	}
	return cells;
}

function getCell(row: string[] | undefined, column: number) {
	if (!row) return "";
	return normalizeCell(row[column]);
}

function getColumnsForRule(row: string[], explicitColumns?: number[]) {
	if (explicitColumns && explicitColumns.length > 0) return explicitColumns;
	return getNonEmptyCells(row).map((cell) => cell.column);
}

function isSectionCandidate(row: string[], selector?: RowSectionSelector) {
	if (!selector) return false;

	const maxLength = selector.maxLength ?? 120;
	const minLength = selector.minLength ?? 2;
	const forbidSentenceEnding = selector.forbidSentenceEnding ?? true;

	if (typeof selector.column === "number") {
		const text = getCell(row, selector.column);
		if (text.length < minLength || text.length > maxLength) return false;
		if (forbidSentenceEnding && /[.!?]$/.test(text)) return false;

		const nonEmpty = getNonEmptyCells(row);
		if (nonEmpty.length > 1) return false;
		return true;
	}

	const nonEmpty = getNonEmptyCells(row);
	if (nonEmpty.length !== 1) return false;
	const text = nonEmpty[0].text;
	if (text.length < minLength || text.length > maxLength) return false;
	if (forbidSentenceEnding && /[.!?]$/.test(text)) return false;
	return true;
}

function isNoteCandidate(
	row: string[],
	section: string | null,
	allowNoteRows: boolean | undefined,
	noteMinLength: number | undefined,
) {
	if (!allowNoteRows) return false;
	if (!section) return false;
	const nonEmpty = getNonEmptyCells(row);
	if (nonEmpty.length !== 1) return false;
	const minLength = noteMinLength ?? 20;
	return nonEmpty[0].text.length >= minLength;
}

function buildEntriesFromPairedRows(
	tabName: string,
	rowIndex: number,
	titleRow: string[],
	descriptionRow: string[] | undefined,
	section: string | null,
	rule: PairedRowsRule,
) {
	if (!descriptionRow) return [] as Entry[];

	const maxTitleLength = rule.maxTitleLength ?? 64;
	const minDescriptionLength = rule.minDescriptionLength ?? 20;
	const descriptionMatch = rule.descriptionMatch ?? "by-order";
	const titleColumns = getColumnsForRule(titleRow, rule.titleColumns);
	const descriptionColumns = getColumnsForRule(
		descriptionRow,
		rule.descriptionColumns,
	);
	const entries: Entry[] = [];

	const titleCells = titleColumns
		.map((column) => ({
			column,
			text: getCell(titleRow, column),
		}))
		.filter(
			(cell) => cell.text.length > 0 && cell.text.length <= maxTitleLength,
		);

	if (descriptionMatch === "by-column") {
		for (const titleCell of titleCells) {
			const description = getCell(descriptionRow, titleCell.column);
			if (!description || description.length < minDescriptionLength) continue;

			const source: SourceSpan = {
				tab: tabName,
				row: rowIndex,
				column: titleCell.column,
			};

			entries.push({
				id: createEntryId(tabName, section, titleCell.text, source),
				tab: tabName,
				section,
				title: titleCell.text,
				description,
				source,
				annotations: [],
			});
		}

		return entries;
	}

	const descriptionCells = descriptionColumns
		.map((column) => ({
			column,
			text: getCell(descriptionRow, column),
		}))
		.filter((cell) => cell.text.length >= minDescriptionLength);

	const pairCount = Math.min(titleCells.length, descriptionCells.length);

	for (let i = 0; i < pairCount; i++) {
		const titleCell = titleCells[i];
		const descriptionCell = descriptionCells[i];

		const source: SourceSpan = {
			tab: tabName,
			row: rowIndex,
			column: titleCell.column,
		};

		entries.push({
			id: createEntryId(tabName, section, titleCell.text, source),
			tab: tabName,
			section,
			title: titleCell.text,
			description: descriptionCell.text,
			source,
			annotations: [],
		});
	}

	return entries;
}

function buildEntryFromSameRow(
	tabName: string,
	rowIndex: number,
	row: string[],
	section: string | null,
	rule: SameRowRule,
) {
	const maxTitleLength = rule.maxTitleLength ?? 80;
	const minDescriptionLength = rule.minDescriptionLength ?? 12;
	const title = getCell(row, rule.titleColumn);
	const description = getCell(row, rule.descriptionColumn);

	if (!title || title.length > maxTitleLength) return null;
	if (!description || description.length < minDescriptionLength) return null;

	const source: SourceSpan = {
		tab: tabName,
		row: rowIndex,
		column: rule.titleColumn,
	};

	return {
		id: createEntryId(tabName, section, title, source),
		tab: tabName,
		section,
		title,
		description,
		source,
		annotations: [],
	} as Entry;
}

function createEntryId(
	tab: string,
	section: string | null,
	title: string,
	source: SourceSpan,
) {
	const sectionPart = section ? slug(section) : "general";
	return [
		slug(tab),
		sectionPart,
		slug(title),
		`r${source.row + 1}`,
		`c${source.column + 1}`,
	].join("_");
}

export function normalizeTab(tabName: string, rows: string[][]): TabData {
	return normalizeTabWithRule(tabName, rows, DEFAULT_TAB_NORMALIZATION_RULE);
}

export function normalizeTabWithRule(
	tabName: string,
	rows: string[][],
	rule: TabNormalizationRule,
): TabData {
	const entries: Entry[] = [];
	let section: string | null = null;

	const startRow = rule.startRow ?? 0;
	const endRow = Math.min(rule.endRow ?? rows.length - 1, rows.length - 1);

	for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
		const row = rows[rowIndex];
		if (!row) continue;
		const nextRow = rows[rowIndex + 1];
		if (getNonEmptyCells(row).length === 0) continue;

		if (isSectionCandidate(row, rule.section)) {
			section =
				typeof rule.section?.column === "number"
					? getCell(row, rule.section.column)
					: (getNonEmptyCells(row)[0]?.text ?? section);
			continue;
		}

		if (rule.strategy === "paired-rows") {
			const descriptionRowOffset = rule.descriptionRowOffset ?? 1;
			const nextDescriptionRow = rows[rowIndex + descriptionRowOffset];
			const pairedEntries = buildEntriesFromPairedRows(
				tabName,
				rowIndex,
				row,
				nextDescriptionRow,
				section,
				rule,
			);

			if (pairedEntries.length > 0) {
				entries.push(...pairedEntries);
				rowIndex += descriptionRowOffset;
				continue;
			}
		} else {
			const sameRowEntry = buildEntryFromSameRow(
				tabName,
				rowIndex,
				row,
				section,
				rule,
			);
			if (sameRowEntry) {
				entries.push(sameRowEntry);
				continue;
			}
		}

		const noteMinLength =
			rule.strategy === "paired-rows" ? rule.noteMinLength : rule.noteMinLength;
		const allowNoteRows =
			rule.strategy === "paired-rows" ? rule.allowNoteRows : rule.allowNoteRows;

		if (isNoteCandidate(row, section, allowNoteRows, noteMinLength)) {
			const cell = getNonEmptyCells(row)[0];
			const source: SourceSpan = {
				tab: tabName,
				row: rowIndex,
				column: cell.column,
			};
			entries.push({
				id: createEntryId(tabName, section, `note-${rowIndex + 1}`, source),
				tab: tabName,
				section,
				title: "Note",
				description: cell.text,
				source,
				annotations: [],
			});
		}
	}

	return {
		name: tabName,
		entries,
	};
}

export function normalizeTabs(
	rawTabs: Record<string, string[][]>,
	config: TabNormalizationConfigMap = {},
	defaultRule: TabNormalizationRule = DEFAULT_TAB_NORMALIZATION_RULE,
) {
	return Object.entries(rawTabs).map(([tabName, rows]) =>
		normalizeTabWithRule(tabName, rows, config[tabName] ?? defaultRule),
	);
}
