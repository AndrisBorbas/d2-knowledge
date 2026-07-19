import { classNames } from "@/lib/data/base";
import type { Section, TabRules } from "@/lib/sheet/types";

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
	initialSectionName?: string;
	skipRowsAtStart?: number;
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
	initialSectionName?: string;
	skipRowsAtStart?: number;
	titleColumn: number;
	descriptionColumn: number;
	statColumn?: number;
	allowContinuationRows?: boolean;
	fragmentNameColumn?: number;
	glossaryHeaderKeywords?: string[];
	glossaryHeaderSectionName?: string;
	classHeaderNames?: string[];
	classHeaderColumn?: number;
	classScopedSectionNames?: string[];
	classSectionSeparator?: string;
	minDescriptionLength?: number;
	maxTitleLength?: number;
	allowNoteRows?: boolean;
	noteMinLength?: number;
	section?: RowSectionSelector;
	startRow?: number;
	endRow?: number;
};

export type SetBonusRowsRule = {
	strategy: "set-bonus-two-rows";
	initialSectionName?: string;
	skipRowsAtStart?: number;
	titleColumn: number;
	bonusRowOffset?: number;
	descriptionColumns?: number[];
	bonusLabels?: [string, string];
	minDescriptionLength?: number;
	maxTitleLength?: number;
	section?: RowSectionSelector;
	startRow?: number;
	endRow?: number;
};

export type TabNormalizationRule =
	PairedRowsRule | SameRowRule | SetBonusRowsRule | TabRules;

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
	return (value ?? "").trim();
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

function normalizeForMatch(value: string) {
	return value.trim().toLowerCase().replace(/s$/, "");
}

function isGlossaryHeaderRow(row: string[], keywords?: string[]) {
	if (!keywords || keywords.length === 0) return false;
	const rowValues = new Set(
		getNonEmptyCells(row).map((cell) => normalizeForMatch(cell.text)),
	);
	return keywords.every((keyword) => rowValues.has(normalizeForMatch(keyword)));
}

function maybeScopeSectionWithClass(
	sectionName: string,
	activeClassName: string | null,
	rule: SameRowRule,
) {
	if (!activeClassName) return sectionName;
	const scopedNames = rule.classScopedSectionNames;
	if (!scopedNames || scopedNames.length === 0) return sectionName;

	const normalized = normalizeForMatch(sectionName);
	const isScoped = scopedNames.some(
		(item) => normalizeForMatch(item) === normalized,
	);
	if (!isScoped) return sectionName;

	const separator = rule.classSectionSeparator ?? " - ";
	return `${activeClassName}${separator}${sectionName}`;
}

function getInlineSectionHeaderName(
	row: string[],
	rule: SameRowRule,
	activeClassName: string | null,
) {
	const titleValue = normalizeForMatch(getCell(row, rule.titleColumn));
	const descriptionValue = normalizeForMatch(
		getCell(row, rule.descriptionColumn),
	);
	const statValue =
		typeof rule.statColumn === "number"
			? normalizeForMatch(getCell(row, rule.statColumn))
			: "";

	// Some tabs use a 3-column header row for aspects instead of a single-cell section row.
	if (
		(titleValue === "aspect" || titleValue === "aspects") &&
		descriptionValue === "information" &&
		(statValue === "fragment slots" || statValue.length === 0)
	) {
		return maybeScopeSectionWithClass("Aspects", activeClassName, rule);
	}

	return null;
}

function getFirstNonEmptyFromColumns(
	row: string[] | undefined,
	columns: number[],
) {
	if (!row) return "";
	for (const column of columns) {
		const value = getCell(row, column);
		if (value.length > 0) return value;
	}
	return "";
}

function checkCurrentClass(row: string[]) {
	for (const cell of row) {
		const cellText = normalizeForMatch(cell);
		if (cellText.length > 0) {
			return classNames.find(
				(className) => normalizeForMatch(className) === cellText,
			);
		}
	}
}

function isSectionCandidate(row: string[], sections: Section[] | undefined) {
	if (sections) {
		for (const cell of row) {
			const cellText = normalizeForMatch(cell);
			if (cellText.length > 0) {
				return sections.find(
					(section) => normalizeForMatch(section.name) === cellText,
				);
			}
		}
	}
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
		});
	}

	return entries;
}

function buildEntryFromSameRow(
	tabName: string,
	rowIndex: number,
	row: string[],
	state: NormalizerState,
	rule: SameRowRule | TabRules,
): Entry | null {
	const nonEmptyCells = getNonEmptyCells(row);

	let title = "",
		description = "",
		extraInfo: string | undefined = undefined;
	const source: SourceSpan = {
		tab: tabName,
		row: rowIndex,
		column: 0,
	};

	if ("type" in rule && rule.type === "element") {
		if (nonEmptyCells.length < 2) return null;
		title = nonEmptyCells[0].text;
		description = nonEmptyCells[1]?.text;
		source.column = nonEmptyCells[0].column;
		extraInfo = nonEmptyCells[2]?.text;
	} else if ("titleColumn" in rule) {
		title = getCell(row, rule.titleColumn);
		description = getCell(row, rule.descriptionColumn);
		source.column = rule.titleColumn;

		if (!title || !description) return null;

		if (typeof rule.statColumn === "number") {
			const stat = getCell(row, rule.statColumn);
			if (stat.length > 0) {
				extraInfo = stat;
			}
		}
	} else {
		return null;
	}

	if (
		"type" in rule &&
		rule.type === "element" &&
		state.section === "Fragments" &&
		typeof rule.fragmentTitlePrefix === "string" &&
		rule.fragmentTitlePrefix.length > 0
	) {
		const normalizedTitle = normalizeForMatch(title);
		const normalizedPrefix = normalizeForMatch(rule.fragmentTitlePrefix);
		if (!normalizedTitle.startsWith(normalizedPrefix)) {
			title = `${rule.fragmentTitlePrefix} ${title}`;
		}
	}

	return {
		id: createEntryId(tabName, state.section, title, source),
		tab: tabName,
		section: state.section,
		title,
		description,
		source,
		extraInfo,
	};
}

function buildEntriesFromSetBonusRows(
	tabName: string,
	rowIndex: number,
	rows: (string[] | null)[],
	section: string | null,
	rule: SetBonusRowsRule,
) {
	const bonusRowOffset = rule.bonusRowOffset ?? 1;
	const firstRow = rows[rowIndex];
	const secondRow = rows[rowIndex + bonusRowOffset];
	if (!firstRow || !secondRow) return [] as Entry[];

	const maxTitleLength = rule.maxTitleLength ?? 120;
	const minDescriptionLength = rule.minDescriptionLength ?? 16;
	const title = getCell(firstRow, rule.titleColumn);
	if (!title || title.length > maxTitleLength) return [];

	const descriptionColumns =
		rule.descriptionColumns && rule.descriptionColumns.length > 0
			? rule.descriptionColumns
			: [2, 3, 4, 5];

	const firstDescription = getFirstNonEmptyFromColumns(
		firstRow,
		descriptionColumns,
	);
	const secondDescription = getFirstNonEmptyFromColumns(
		secondRow,
		descriptionColumns,
	);

	const entries: Entry[] = [];

	if (firstDescription.length >= minDescriptionLength) {
		const source: SourceSpan = {
			tab: tabName,
			row: rowIndex,
			column: rule.titleColumn,
		};
		entries.push({
			id: createEntryId(tabName, section, title, source),
			tab: tabName,
			section,
			title: title,
			description: firstDescription,
			source,
		});
	}

	if (secondDescription.length >= minDescriptionLength) {
		const source: SourceSpan = {
			tab: tabName,
			row: rowIndex + bonusRowOffset,
			column: rule.titleColumn,
		};
		entries.push({
			id: createEntryId(tabName, section, title, source),
			tab: tabName,
			section,
			title: title,
			description: secondDescription,
			source,
		});
	}

	return entries;
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

type NormalizerState = {
	section: string | null;
	activeClassName: string | null;
};

export function normalizeTabWithRule(
	tabName: string,
	rows: (string[] | null)[],
	rule: TabNormalizationRule,
): TabData {
	const entries: Entry[] = [];

	const currentState: NormalizerState = {
		section: "sections" in rule ? (rule.sections?.[0]?.name ?? null) : null,
		activeClassName: null,
	};

	const startRow =
		"skipStart" in rule
			? (rule.skipStart ?? 0)
			: "skipRowsAtStart" in rule
				? (rule.skipRowsAtStart ?? 0)
				: 0;
	const endRow = rows.length - 1;

	for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
		const row = rows[rowIndex];
		if (!row) continue;
		if (getNonEmptyCells(row).length === 0) continue;

		if ("type" in rule && rule.type === "element") {
			const currentClass = checkCurrentClass(row);
			if (currentClass) {
				currentState.activeClassName = currentClass;
				continue;
			}
		}

		const sectionName = isSectionCandidate(
			row,
			"sections" in rule ? rule.sections : undefined,
		);
		if (sectionName) {
			currentState.section = sectionName.name;
			continue;
		}

		if ("type" in rule && rule.type === "element") {
			if (getNonEmptyCells(row).length === 1) {
				continue;
			}
		}

		if (rule.strategy === "paired-rows") {
			// const descriptionRowOffset = rule.descriptionRowOffset ?? 1;
			// const nextDescriptionRow = rows[rowIndex + descriptionRowOffset];
			// const pairedEntries = buildEntriesFromPairedRows(
			// 	tabName,
			// 	rowIndex,
			// 	row,
			// 	nextDescriptionRow,
			// 	currentState.section,
			// 	rule,
			// );
			// if (pairedEntries.length > 0) {
			// 	entries.push(...pairedEntries);
			// 	rowIndex += descriptionRowOffset;
			// 	continue;
			// }
		} else if (rule.strategy === "same-row") {
			const sameRowEntry = buildEntryFromSameRow(
				tabName,
				rowIndex,
				row,
				currentState,
				rule,
			);
			if (sameRowEntry) {
				entries.push(sameRowEntry);
				continue;
			}

			if (
				"allowContinuationRows" in rule &&
				rule.allowContinuationRows &&
				entries.length > 0
			) {
				const titleValue = getCell(row, rule.titleColumn);
				if (titleValue.length === 0) {
					const fragmentColumn =
						typeof rule.fragmentNameColumn === "number"
							? rule.fragmentNameColumn
							: rule.titleColumn;
					const fragmentName = getCell(row, fragmentColumn);
					const fragmentEffect = getCell(row, rule.descriptionColumn);
					const fragmentStat =
						typeof rule.statColumn === "number"
							? getCell(row, rule.statColumn)
							: "";

					if (fragmentName.length > 0 && fragmentEffect.length > 0) {
						const lastEntry = entries[entries.length - 1];
						const fragmentLine =
							fragmentStat.length > 0
								? `Fragment ${fragmentName}: ${fragmentEffect} | Stat/Cooldown: ${fragmentStat}`
								: `Fragment ${fragmentName}: ${fragmentEffect}`;
						lastEntry.description = `${lastEntry.description}\n\n${fragmentLine}`;
						continue;
					}
				}
			}
		} else if (
			rule.strategy === "set-bonus-two-rows" &&
			"titleColumn" in rule
		) {
			const setBonusEntries = buildEntriesFromSetBonusRows(
				tabName,
				rowIndex,
				rows,
				currentState.section,
				rule,
			);
			if (setBonusEntries.length > 0) {
				entries.push(...setBonusEntries);
				rowIndex += rule.bonusRowOffset ?? 1;
				continue;
			}
		} else {
			continue;
		}

		const noteMinLength =
			"noteMinLength" in rule ? rule.noteMinLength : undefined;
		const allowNoteRows =
			"allowNoteRows" in rule ? rule.allowNoteRows : undefined;

		if (
			isNoteCandidate(row, currentState.section, allowNoteRows, noteMinLength)
		) {
			const cell = getNonEmptyCells(row)[0];
			const source: SourceSpan = {
				tab: tabName,
				row: rowIndex,
				column: cell.column,
			};
			entries.push({
				id: createEntryId(
					tabName,
					currentState.section,
					`note-${rowIndex + 1}`,
					source,
				),
				tab: tabName,
				section: currentState.section,
				title: "Note",
				description: cell.text,
				source,
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
