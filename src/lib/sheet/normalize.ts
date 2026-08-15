import { classNames } from "@/lib/compendium/keywords/data";
import type {
	DescriptionSegment,
	Entry,
	SourceSpan,
	TabData,
} from "@/lib/compendium/model";
import type { Section } from "@/lib/sheet/types";

export type TabNormalizationRule = {
	strategy:
		| "paired-rows"
		| "same-row"
		| "set-bonus-two-rows"
		| "skip"
		| "paired-columns";
	type?: "element";
	fragmentTitlePrefix?: string;
	skipStart?: number;
	sections?: Section[];
	dynamicSection?: {
		maxLength?: number;
		minLength?: number;
		forbidSentenceEnding?: boolean;
	};

	// same-row (non-element)
	titleColumn?: number;
	descriptionColumn?: number;
	statColumn?: number;
	allowContinuationRows?: boolean;
	fragmentNameColumn?: number;

	// paired-columns
	titleColumns?: number[];
	descriptionRowOffset?: number;

	// set-bonus-two-rows
	bonusRowOffset?: number;
	descriptionColumns?: number[];

	// shared sizing/filtering
	maxTitleLength?: number;
	minDescriptionLength?: number;
	allowNoteRows?: boolean;
	noteMinLength?: number;
};

export type TabNormalizationConfigMap = Partial<
	Record<string, TabNormalizationRule>
>;

export const DEFAULT_TAB_NORMALIZATION_RULE: TabNormalizationRule = {
	strategy: "paired-rows",
	descriptionRowOffset: 1,
	maxTitleLength: 64,
	minDescriptionLength: 20,
	allowNoteRows: true,
	noteMinLength: 20,
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

function getCell(row: string[] | undefined, column: number | undefined) {
	if (!row || typeof column !== "number") return "";
	return normalizeCell(row[column]);
}

function normalizeForMatch(value: string) {
	return value.trim().toLowerCase().replace(/s$/, "");
}

function getFirstNonEmptyFromColumns(
	row: string[] | undefined,
	columns: number[],
): { column: number; text: string } | null {
	if (!row) return null;
	for (const column of columns) {
		const text = getCell(row, column);
		if (text.length > 0) return { column, text };
	}
	return null;
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

const CLASS_SCOPED_SECTIONS = [
	"Aspect",
	"Grenade Abilities",
	"Melee Abilities",
	"Super Abilities",
	"Class Abilities",
];

function buildBaseGroups(
	tabName: string,
	section: string | null,
	activeClassName: string | null = null,
) {
	const groups = [tabName];
	if (section) groups.push(section);
	if (section && CLASS_SCOPED_SECTIONS.includes(section)) {
		groups.push("Abilities");
		if (activeClassName) groups.push(activeClassName);
	}
	return groups;
}

function buildEntriesFromPairedColumns(
	tabName: string,
	rowIndex: number,
	titleRow: string[],
	descriptionRow: string[] | undefined,
	descriptionRowIndex: number,
	section: string | null,
	rule: TabNormalizationRule,
): Entry[] {
	if (!descriptionRow || !rule.titleColumns) return [];

	const maxTitleLength = rule.maxTitleLength ?? 80;
	const minDescriptionLength = rule.minDescriptionLength ?? 16;

	const titleCells = rule.titleColumns
		.map((column) => ({ column, text: getCell(titleRow, column) }))
		.filter(
			(cell) => cell.text.length > 0 && cell.text.length <= maxTitleLength,
		);
	const descriptionCells = getNonEmptyCells(descriptionRow).filter(
		(cell) => cell.text.length >= minDescriptionLength,
	);

	const pairCount = Math.min(titleCells.length, descriptionCells.length);
	const entries: Entry[] = [];

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
			groups: buildBaseGroups(tabName, section),
			title: titleCell.text,
			description: descriptionCell.text,
			descriptionSegments: [
				{
					source: {
						tab: tabName,
						row: descriptionRowIndex,
						column: descriptionCell.column,
					},
					start: 0,
					length: descriptionCell.text.length,
				},
			],
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
	rule: TabNormalizationRule,
): Entry | null {
	const nonEmptyCells = getNonEmptyCells(row);

	let title = "",
		description = "",
		extraInfo: string | undefined = undefined;
	let descriptionColumn = -1;
	const source: SourceSpan = {
		tab: tabName,
		row: rowIndex,
		column: 0,
	};

	if (rule.type === "element") {
		if (nonEmptyCells.length < 2) return null;
		title = nonEmptyCells[0].text;
		description = nonEmptyCells[1]?.text;
		descriptionColumn = nonEmptyCells[1].column;
		source.column = nonEmptyCells[0].column;
		extraInfo = nonEmptyCells[2]?.text;
	} else if (typeof rule.titleColumn === "number") {
		title = getCell(row, rule.titleColumn);
		description = getCell(row, rule.descriptionColumn);
		descriptionColumn = rule.descriptionColumn ?? -1;
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
		groups: buildBaseGroups(tabName, state.section, state.activeClassName),
		title,
		description,
		descriptionSegments:
			descriptionColumn >= 0
				? [
						{
							source: {
								tab: tabName,
								row: rowIndex,
								column: descriptionColumn,
							},
							start: 0,
							length: description.length,
						},
					]
				: undefined,
		source,
		extraInfo,
	};
}

function buildEntriesFromSetBonusRows(
	tabName: string,
	rowIndex: number,
	rows: (string[] | null)[],
	section: string | null,
	rule: TabNormalizationRule,
) {
	if (typeof rule.titleColumn !== "number") return [] as Entry[];

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

	if (
		firstDescription &&
		firstDescription.text.length >= minDescriptionLength
	) {
		const source: SourceSpan = {
			tab: tabName,
			row: rowIndex,
			column: rule.titleColumn,
		};
		entries.push({
			id: createEntryId(tabName, section, title, source),
			tab: tabName,
			section,
			groups: [...buildBaseGroups(tabName, section), "Armor Sets"],
			title: title,
			description: firstDescription.text,
			descriptionSegments: [
				{
					source: {
						tab: tabName,
						row: rowIndex,
						column: firstDescription.column,
					},
					start: 0,
					length: firstDescription.text.length,
				},
			],
			source,
		});
	}

	if (
		secondDescription &&
		secondDescription.text.length >= minDescriptionLength
	) {
		const descriptionRow = rowIndex + bonusRowOffset;
		const source: SourceSpan = {
			tab: tabName,
			row: descriptionRow,
			column: rule.titleColumn,
		};
		entries.push({
			id: createEntryId(tabName, section, title, source),
			tab: tabName,
			section,
			groups: [...buildBaseGroups(tabName, section), "Armor Sets"],
			title: title,
			description: secondDescription.text,
			descriptionSegments: [
				{
					source: {
						tab: tabName,
						row: descriptionRow,
						column: secondDescription.column,
					},
					start: 0,
					length: secondDescription.text.length,
				},
			],
			source,
		});
	}

	return entries;
}

function firstTitleLine(title: string) {
	return title.split("\n")[0] ?? "";
}

function joinTitleLines(title: string) {
	return title
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(" ");
}

// Grenade rows in the element tabs are sometimes followed by a row bearing an
// Aspect's name, whose "description" is really a synergy note for the grenade
// above it (e.g. Arc's "Touch of Thunder" under "Lightning Grenade"). Left
// alone these become phantom duplicate entries that also pollute the real
// Aspect's keyword references. Fold them into the preceding grenade instead.
function mergeGrenadeAspectSynergies(entries: Entry[]): Entry[] {
	const aspectTitles = new Set(
		entries
			.filter((entry) => entry.section === "Aspect")
			.map((entry) => normalizeForMatch(firstTitleLine(entry.title))),
	);

	if (aspectTitles.size === 0) {
		return entries;
	}

	const merged: Entry[] = [];

	for (const entry of entries) {
		const previous = merged[merged.length - 1];

		if (
			entry.section === "Grenade Abilities" &&
			previous?.section === "Grenade Abilities" &&
			aspectTitles.has(normalizeForMatch(firstTitleLine(entry.title)))
		) {
			const prefix = `Aspect - ${joinTitleLines(entry.title)}: `;
			const glueOffset =
				previous.description.length + "\n\n".length + prefix.length;

			previous.description = `${previous.description}\n\n${prefix}${entry.description}`;
			previous.descriptionSegments = [
				...(previous.descriptionSegments ?? []),
				...(entry.descriptionSegments ?? []).map((segment) => ({
					...segment,
					start: segment.start + glueOffset,
				})),
			];
			continue;
		}

		merged.push(entry);
	}

	return merged;
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
	lastRowWasDynamicSection: boolean;
};

export function normalizeTabWithRule(
	tabName: string,
	rows: (string[] | null)[],
	rule: TabNormalizationRule,
): TabData {
	const entries: Entry[] = [];

	const currentState: NormalizerState = {
		section: rule.sections?.[0]?.name ?? null,
		activeClassName: null,
		lastRowWasDynamicSection: false,
	};

	const startRow = rule.skipStart ?? 0;
	const endRow = rows.length - 1;

	for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
		const row = rows[rowIndex];
		if (!row) continue;
		if (getNonEmptyCells(row).length === 0) continue;

		if (rule.type === "element") {
			const currentClass = checkCurrentClass(row);
			if (currentClass) {
				currentState.activeClassName = currentClass;
				continue;
			}
		}

		if (rule.dynamicSection) {
			const singleCellCandidates = getNonEmptyCells(row);
			if (singleCellCandidates.length === 1) {
				const candidateText = singleCellCandidates[0].text;
				const maxLength = rule.dynamicSection.maxLength ?? 80;
				const minLength = rule.dynamicSection.minLength ?? 2;
				const endsWithSentence = /[.!?]$/.test(candidateText);
				const isCandidate =
					candidateText.length >= minLength &&
					candidateText.length <= maxLength &&
					!(rule.dynamicSection.forbidSentenceEnding && endsWithSentence);

				if (isCandidate) {
					if (!currentState.lastRowWasDynamicSection) {
						currentState.section = candidateText;
					}
					currentState.lastRowWasDynamicSection = true;
					continue;
				}
			}
			currentState.lastRowWasDynamicSection = false;
		}

		const sectionName = isSectionCandidate(row, rule.sections);
		if (sectionName) {
			currentState.section = sectionName.name;
			continue;
		}

		if (rule.type === "element") {
			if (getNonEmptyCells(row).length === 1) {
				continue;
			}
		}

		if (rule.strategy === "paired-rows") {
			// No title/description strategy implemented for this row shape;
			// falls through to note-row detection below.
		} else if (rule.strategy === "paired-columns") {
			const descriptionRowOffset = rule.descriptionRowOffset ?? 1;
			const descriptionRowIndex = rowIndex + descriptionRowOffset;
			const descriptionRow = rows[descriptionRowIndex];
			const pairedEntries = buildEntriesFromPairedColumns(
				tabName,
				rowIndex,
				row,
				descriptionRow ?? undefined,
				descriptionRowIndex,
				currentState.section,
				rule,
			);
			if (pairedEntries.length > 0) {
				entries.push(...pairedEntries);
				rowIndex += descriptionRowOffset;
				continue;
			}
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

			if (rule.allowContinuationRows && entries.length > 0) {
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

						const fragmentPrefix = "Fragment ";
						const fragmentMid = ": ";
						const statPrefix = " | Stat/Cooldown: ";

						let fragmentLine = `${fragmentPrefix}${fragmentName}${fragmentMid}${fragmentEffect}`;
						const fragmentSegments: DescriptionSegment[] = [];

						if (typeof fragmentColumn === "number") {
							fragmentSegments.push({
								source: { tab: tabName, row: rowIndex, column: fragmentColumn },
								start: fragmentPrefix.length,
								length: fragmentName.length,
							});
						}
						if (typeof rule.descriptionColumn === "number") {
							fragmentSegments.push({
								source: {
									tab: tabName,
									row: rowIndex,
									column: rule.descriptionColumn,
								},
								start:
									fragmentPrefix.length +
									fragmentName.length +
									fragmentMid.length,
								length: fragmentEffect.length,
							});
						}
						if (fragmentStat.length > 0) {
							const statStart = fragmentLine.length + statPrefix.length;
							fragmentLine += `${statPrefix}${fragmentStat}`;
							if (typeof rule.statColumn === "number") {
								fragmentSegments.push({
									source: {
										tab: tabName,
										row: rowIndex,
										column: rule.statColumn,
									},
									start: statStart,
									length: fragmentStat.length,
								});
							}
						}

						const glueOffset = lastEntry.description.length + "\n\n".length;
						lastEntry.description = `${lastEntry.description}\n\n${fragmentLine}`;
						lastEntry.descriptionSegments = [
							...(lastEntry.descriptionSegments ?? []),
							...fragmentSegments.map((segment) => ({
								...segment,
								start: segment.start + glueOffset,
							})),
						];
						continue;
					}
				}
			}
		} else if (rule.strategy === "set-bonus-two-rows") {
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

		const noteMinLength = rule.noteMinLength;
		const allowNoteRows = rule.allowNoteRows;

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
				groups: buildBaseGroups(tabName, currentState.section),
				title: "Note",
				description: cell.text,
				source,
			});
		}
	}

	const finalEntries =
		rule.type === "element" ? mergeGrenadeAspectSynergies(entries) : entries;

	return {
		name: tabName,
		entries: finalEntries,
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
