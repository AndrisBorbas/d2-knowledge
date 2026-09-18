import {
	type SheetColorIndex,
	sheetColorKey,
	type SheetMerge,
} from "@/lib/sheets/api";

import { readDdcSheetSnapshot } from "./snapshot";

// The Game Mechanics tab is a document, not a list of perks: chapters of prose,
// name + effect lists and number tables, laid out on the grid by eye. Nothing
// here feeds the compendium. It is read into blocks for its own page.

export const GAME_MECHANICS_TAB_NAME = "Game Mechanics";

// The chapter headings, in the sheet's own words. The table of contents at the
// top of the tab names them differently ("Armor & Character Stats" for
// "Character Attributes"), and a chapter heading is laid out no differently
// from the headings inside it, so this is the one thing told rather than read.
// A heading that drops off this list still renders, one level down.
const CHAPTER_TITLES = [
	"Ability Energy Generation",
	"Activity Modifiers",
	"Armor Charge",
	"Character Attributes",
	"Champions of the Darkness",
	"Combatant Classification",
	"Elemental Orbs",
	"Heat Weapons",
	"Super Ability Energy",
	"Warmind Cells",
];

// The narrow column down the left edge that repeats a heading for the sheet's
// own navigation, or labels the rows of a table.
const SIDEBAR_COLUMN = 1;

const IGNORED_CELLS = new Set(["-", "Go back to the top!"]);

// The tab's own contents list, which names the chapters again. It ends at the
// first row labeled in the sidebar column, which is where the first chapter
// starts, or at a gap of two blank rows. A single blank row is not enough: a
// hidden row inside the list reads as one.
const CONTENTS_TITLE = "table of contents";
const CONTENTS_END_GAP = 2;

// Values the sheet has not measured yet ("-x", "-%"). A table row made of
// nothing else is left out.
const PLACEHOLDER_PATTERN = /^-[x%]?$/;

// "▲▲" / "▼" under a modifier's name: how much it moves the challenge score.
const DIFFICULTY_PATTERN = /^[▲▼\s]+$/;

export type RichRun = { text: string; color?: string };
export type RichText = RichRun[];

export type MechanicsTableCell = {
	text: RichText;
	colSpan: number;
	rowSpan: number;
	// A gap in the row, drawn so the columns still line up.
	isEmpty?: boolean;
};

export type MechanicsTable = {
	headerRows: MechanicsTableCell[][];
	bodyRows: MechanicsTableCell[][];
};

export type MechanicsEntry = {
	name: string;
	note?: string;
	difficulty?: string;
	// The in-game icon, for the modifiers and Banes the manifest names.
	iconPath?: string;
	description: RichText;
};

export type MechanicsBlock =
	| {
			kind: "heading";
			id: string;
			title: string;
			subtitle?: string;
			difficulty?: string;
	  }
	| { kind: "prose"; columns: RichText[] }
	| { kind: "entries"; entries: MechanicsEntry[] }
	| { kind: "table"; table: MechanicsTable };

export type MechanicsChapter = {
	id: string;
	title: string;
	blocks: MechanicsBlock[];
};

type Cell = { row: number; column: number; raw: string; text: string };

type TableCell = Cell & { endRow: number; endColumn: number };

function toSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function normalizeTitle(value: string) {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

const CHAPTER_KEYS = new Set(CHAPTER_TITLES.map(normalizeTitle));

function cleanText(value: string) {
	return value
		.replace(/\t+/g, " ")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();
}

function splitLines(value: string) {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function stripTrailingPeriod(value: string) {
	return value.replace(/\.$/, "").trim();
}

// The cell's text cut into runs by the sheet's text colors, with the tabs and
// outer whitespace the grid carries trimmed off without losing the offsets the
// colors were recorded against.
function toRichText(cell: Cell, colors: SheetColorIndex): RichText {
	const colorCell = colors.get(
		sheetColorKey(GAME_MECHANICS_TAB_NAME, cell.row, cell.column),
	);
	const raw = cell.raw.replace(/\t/g, " ");
	const runs: RichText =
		colorCell && colorCell.text === cell.raw
			? colorCell.runs.map((run) => ({
					text: raw.slice(run.start, run.end),
					color: run.color,
				}))
			: [{ text: raw }];

	const merged: RichText = [];
	for (const run of runs) {
		if (run.text.length === 0) continue;
		const previous = merged.at(-1);
		// Whitespace takes whatever color sits beside it, so a sentence colored
		// word by word still comes out as one span.
		if (previous && (previous.color === run.color || !run.text.trim())) {
			previous.text += run.text;
		} else {
			merged.push({ ...run });
		}
	}

	while (merged.length > 0 && !merged[0].text.trim()) merged.shift();
	while (merged.length > 0 && !merged.at(-1)!.text.trim()) merged.pop();
	if (merged.length === 0) return [];

	merged[0].text = merged[0].text.trimStart();
	const last = merged.at(-1)!;
	last.text = last.text.trimEnd();
	return merged.map((run) =>
		run.text.includes(" \n")
			? { ...run, text: run.text.replace(/ +\n/g, "\n") }
			: run,
	);
}

type HeadingParts = { title: string; subtitle?: string; difficulty?: string };

// A heading is one short line, optionally "Category | what it covers" and a
// difficulty marker under it. Anything that reads as a sentence is prose.
function parseHeading(text: string): HeadingParts | null {
	const [first, ...rest] = splitLines(text);
	if (!first) return null;
	if (!rest.every((line) => DIFFICULTY_PATTERN.test(line))) return null;

	const difficulty = rest.join("").replace(/\s+/g, "") || undefined;
	const separator = first.indexOf(" | ");
	if (separator > 0) {
		if (first.length > 120) return null;
		return {
			title: first.slice(0, separator).trim(),
			subtitle: stripTrailingPeriod(first.slice(separator + 3)),
			difficulty,
		};
	}

	if (first.length > 80 || /[.!]$/.test(first)) return null;
	return { title: first, difficulty };
}

// The effect half of a name + effect row. Short values ("1.75s", "70 [100]")
// are table cells, sentences are effects.
function isEffectText(text: string) {
	return text.includes("\n") || text.length >= 40 || /[.!?]$/.test(text);
}

function isNameText(text: string) {
	const [first] = splitLines(text);
	return Boolean(first) && first.length <= 60 && !/^[\d<>≤≥~.-]/.test(first);
}

function parseEntryName(text: string) {
	const [name, ...rest] = splitLines(text);
	const difficulty = rest
		.filter((line) => DIFFICULTY_PATTERN.test(line))
		.join("")
		.replace(/\s+/g, "");
	const note = rest.filter((line) => !DIFFICULTY_PATTERN.test(line)).join(" ");
	return {
		name,
		note: note || undefined,
		difficulty: difficulty || undefined,
	};
}

// Where a cell ends. The sheet's merges when the snapshot carries them,
// otherwise up to the next filled cell in the row and no further down.
function makeSpanResolver(merges: SheetMerge[] | undefined) {
	const byStart = new Map<string, SheetMerge>();
	for (const merge of merges ?? []) {
		byStart.set(`${merge.startRow}:${merge.startColumn}`, merge);
	}

	// Rows a merge from above reaches into. They look blank on the grid but
	// belong to whatever block the merge started in.
	const continuedRows = new Set<number>();
	for (const merge of merges ?? []) {
		for (let row = merge.startRow + 1; row < merge.endRow; row++) {
			continuedRows.add(row);
		}
	}

	return {
		isContinuedRow: (row: number) => continuedRows.has(row),
		resolve(cell: Cell, nextColumn: number): TableCell {
			const merge = byStart.get(`${cell.row}:${cell.column}`);
			if (merge) {
				return { ...cell, endRow: merge.endRow, endColumn: merge.endColumn };
			}
			return {
				...cell,
				endRow: cell.row + 1,
				endColumn: merges && merges.length > 0 ? cell.column + 1 : nextColumn,
			};
		},
	};
}

type SpanResolver = ReturnType<typeof makeSpanResolver>;

function hasDigit(cells: Cell[]) {
	return cells.some((cell) => /\d/.test(cell.text));
}

function buildTable(
	rows: Cell[][],
	spans: SpanResolver,
	colors: SheetColorIndex,
): MechanicsTable | null {
	const kept = rows.filter((cells) =>
		cells
			.filter((cell) => cell.column !== SIDEBAR_COLUMN)
			.some((cell) => !PLACEHOLDER_PATTERN.test(cell.text)),
	);
	if (kept.length === 0) return null;

	const rowIndex = new Map(kept.map((cells, index) => [cells[0].row, index]));
	const rightEdge = Math.max(
		...kept.flatMap((cells) => cells.map((cell) => cell.column + 1)),
	);

	const tableRows = kept.map((cells) =>
		cells.map((cell, index) =>
			spans.resolve(cell, cells[index + 1]?.column ?? rightEdge),
		),
	);
	const left = Math.min(
		...tableRows.flatMap((cells) => cells.map((cell) => cell.column)),
	);
	const right = Math.max(
		...tableRows.flatMap((cells) => cells.map((cell) => cell.endColumn)),
	);

	// Grid positions a rowspan from an earlier row already fills.
	const covered = new Set<string>();

	// Grid columns some filled cell reaches. The rest are spacers the sheet
	// uses to push one group of columns away from the next.
	const usedColumns = new Set<number>();

	type PlacedCell = MechanicsTableCell & { column: number };

	const placed = tableRows.map((cells, index) => {
		const out: PlacedCell[] = [];
		let column = left;
		let gap = 0;

		const flushGap = () => {
			if (gap > 0) {
				out.push({
					text: [],
					colSpan: gap,
					rowSpan: 1,
					isEmpty: true,
					column: column - gap,
				});
			}
			gap = 0;
		};

		const byColumn = new Map(cells.map((cell) => [cell.column, cell]));
		while (column < right) {
			if (covered.has(`${index}:${column}`)) {
				flushGap();
				column++;
				continue;
			}

			const cell = byColumn.get(column);
			if (!cell) {
				gap++;
				column++;
				continue;
			}

			flushGap();
			const endColumn = Math.min(cell.endColumn, right);
			// Only rows that made it into the table count toward the span.
			let rowSpan = 1;
			for (let row = cell.row + 1; row < cell.endRow; row++) {
				const target = rowIndex.get(row);
				if (target === undefined || target !== index + rowSpan) continue;
				rowSpan++;
			}
			for (let offset = 1; offset < rowSpan; offset++) {
				for (let c = column; c < endColumn; c++) {
					covered.add(`${index + offset}:${c}`);
				}
			}

			const isPlaceholder = PLACEHOLDER_PATTERN.test(cell.text);
			if (!isPlaceholder) {
				for (let c = column; c < endColumn; c++) usedColumns.add(c);
			}
			out.push({
				text: isPlaceholder ? [] : toRichText(cell, colors),
				colSpan: endColumn - column,
				rowSpan,
				isEmpty: isPlaceholder || undefined,
				column,
			});
			column = endColumn;
		}
		flushGap();
		return out;
	});

	const output = placed.map((cells) =>
		cells
			.map(({ column, ...cell }) => {
				let colSpan = 0;
				for (let c = column; c < column + cell.colSpan; c++) {
					if (usedColumns.has(c)) colSpan++;
				}
				return { ...cell, colSpan };
			})
			.filter((cell) => cell.colSpan > 0),
	);

	// Leading rows with no numbers in them label the columns below.
	let headerCount = 0;
	while (
		headerCount < kept.length - 1 &&
		!hasDigit(kept[headerCount]) &&
		// A rowspan out of the header would straddle thead and tbody.
		output[headerCount].every((cell) => cell.rowSpan === 1)
	) {
		headerCount++;
	}

	return {
		headerRows: output.slice(0, headerCount),
		bodyRows: output.slice(headerCount),
	};
}

export function parseGameMechanics(
	rows: string[][],
	colors: SheetColorIndex,
	merges: SheetMerge[] | undefined,
): MechanicsChapter[] {
	const spans = makeSpanResolver(merges);
	const chapters: MechanicsChapter[] = [];
	const usedIds = new Set<string>();

	const uniqueId = (title: string) => {
		const base = toSlug(title) || "section";
		let id = base;
		for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
		usedIds.add(id);
		return id;
	};

	let current: MechanicsChapter | null = null;
	let tableRows: Cell[][] = [];
	let entries: MechanicsEntry[] = [];
	// The rows the pending entries came from, in case the rest of the list
	// turns out to be a table.
	let entryRows: Cell[][] = [];

	const push = (block: MechanicsBlock) => {
		const previous = current?.blocks.at(-1);
		// The sheet spaces some lists (the Banes) one blank row per item.
		if (block.kind === "entries" && previous?.kind === "entries") {
			previous.entries.push(...block.entries);
			return;
		}
		current?.blocks.push(block);
	};

	const flush = () => {
		if (tableRows.length > 0) {
			const onlyRow = tableRows.length === 1 ? tableRows[0] : null;
			// A lone short row ("Challenge Modifiers | Description") is a caption
			// over the list that follows, not a table.
			const caption =
				onlyRow && onlyRow.length <= 2 ? parseHeading(onlyRow[0].text) : null;
			if (caption) {
				push({ kind: "heading", id: uniqueId(caption.title), ...caption });
			} else {
				const table = buildTable(tableRows, spans, colors);
				if (table) push({ kind: "table", table });
			}
		}
		if (entries.length > 0) push({ kind: "entries", entries });
		tableRows = [];
		entries = [];
		entryRows = [];
	};

	let previousBlank = true;
	let inContents = false;
	let blankRun = 0;

	for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		const cells: Cell[] = (rows[rowIndex] ?? [])
			.map((raw, column) => ({
				row: rowIndex,
				column,
				raw,
				text: cleanText(raw),
			}))
			.filter((cell) => cell.text && !IGNORED_CELLS.has(cell.text));

		if (cells.length === 0) {
			if (!spans.isContinuedRow(rowIndex)) {
				flush();
				previousBlank = true;
				blankRun++;
				if (blankRun >= CONTENTS_END_GAP) inContents = false;
			}
			continue;
		}
		blankRun = 0;

		if (
			inContents &&
			cells.some((cell) => cell.column === SIDEBAR_COLUMN) &&
			!cells.some((cell) => normalizeTitle(cell.text) === CONTENTS_TITLE)
		) {
			inContents = false;
		}

		if (
			inContents ||
			cells.some((cell) => normalizeTitle(cell.text) === CONTENTS_TITLE)
		) {
			inContents = true;
			continue;
		}

		const wasBlank = previousBlank;
		previousBlank = false;

		// A heading, either alone on its row or beside its sidebar copy. The
		// sidebar form only counts after a gap, since a table row labeled in the
		// sidebar column with a single value looks the same.
		const headingCell =
			cells.length === 1 && cells[0].column !== SIDEBAR_COLUMN
				? cells[0]
				: cells.length === 2 && cells[0].column === SIDEBAR_COLUMN && wasBlank
					? cells[1]
					: null;
		const heading = headingCell
			? cells.length === 2
				? (parseHeading(headingCell.text) ?? {
						title: stripTrailingPeriod(splitLines(headingCell.text)[0]),
					})
				: parseHeading(headingCell.text)
			: null;

		if (heading) {
			flush();
			heading.title = stripTrailingPeriod(heading.title);
			if (CHAPTER_KEYS.has(normalizeTitle(heading.title))) {
				current = {
					id: uniqueId(heading.title),
					title: heading.title,
					blocks: [],
				};
				chapters.push(current);
			} else {
				push({ kind: "heading", id: uniqueId(heading.title), ...heading });
			}
			continue;
		}

		// Everything above the first chapter is the tab's title and contents.
		if (!current) continue;

		const inTable = tableRows.length > 0;

		// Paragraphs, alone or side by side.
		if (
			(cells.length === 1 && (!inTable || cells[0].text.length >= 80)) ||
			(cells.length > 1 && cells.every((cell) => cell.text.length >= 80))
		) {
			flush();
			push({
				kind: "prose",
				columns: cells.map((cell) => toRichText(cell, colors)),
			});
			continue;
		}

		const [nameCell, effectCell] = cells;
		if (
			cells.length === 2 &&
			!inTable &&
			isNameText(nameCell.text) &&
			isEffectText(effectCell.text)
		) {
			entries.push({
				...parseEntryName(nameCell.text),
				description: toRichText(effectCell, colors),
			});
			entryRows.push(cells);
			continue;
		}

		// A row with a long value ahead of shorter ones in the same columns
		// ("Detonation Damage" over "Explosive Radius") started a table, not a
		// list.
		const sameColumns = (row: Cell[]) =>
			row.length === cells.length &&
			row.every((cell, index) => cell.column === cells[index].column);
		if (entryRows.length > 0 && entryRows.every(sameColumns)) {
			tableRows = entryRows;
			entries = [];
			entryRows = [];
		} else if (entries.length > 0) {
			flush();
		}
		tableRows.push(cells);
	}

	flush();
	return chapters.filter((chapter) => chapter.blocks.length > 0);
}

export async function loadGameMechanics() {
	const { grid, colors, merges } = await readDdcSheetSnapshot();
	const rows = grid[GAME_MECHANICS_TAB_NAME];
	if (!rows) {
		throw new Error(
			`The Destiny Data Compendium snapshot has no "${GAME_MECHANICS_TAB_NAME}" tab. Re-run \`bun run data:ddc:snapshot\`.`,
		);
	}
	return parseGameMechanics(rows, colors, merges[GAME_MECHANICS_TAB_NAME]);
}

// The chapters whose lists are activity modifiers and Banes, the only ones
// whose names mean anything to the manifest. Stat names ("Health", "Class")
// elsewhere on the tab must not pick up a modifier that happens to share one.
const MODIFIER_CHAPTERS = new Set(
	["Activity Modifiers", "Combatant Classification"].map(normalizeTitle),
);

// The spellings a modifier might go by in the manifest: the sheet prefixes
// faction modifiers ("Scorn: Raider Shields") and suffixes the trade-offs, and
// the two disagree on plurals ("Glass Cannon" / "Glass Cannons"). The name
// under it counts too: Lawless Frontier is "Modified Health Rules" in game.
function modifierNameCandidates(entry: MechanicsEntry) {
	const bases = [entry.name, entry.note]
		.filter((value): value is string => Boolean(value))
		.flatMap((value) => [
			value,
			value.replace(/^[A-Za-z]+: /, ""),
			value.replace(/ Trade-Off$/i, ""),
		]);
	return [
		...new Set(
			bases.flatMap((value) => [
				value,
				value.endsWith("s") ? value.slice(0, -1) : `${value}s`,
			]),
		),
	];
}

// Fills in each modifier and Bane's in-game icon where the manifest has one.
// Most Banes and the newer Portal modifiers are not in the public manifest
// under their own names, so they stay without.
export function attachModifierIcons(
	chapters: MechanicsChapter[],
	getIconPath: (name: string) => string | undefined,
): MechanicsChapter[] {
	return chapters.map((chapter) => {
		if (!MODIFIER_CHAPTERS.has(normalizeTitle(chapter.title))) return chapter;
		return {
			...chapter,
			blocks: chapter.blocks.map((block) =>
				block.kind === "entries"
					? {
							...block,
							entries: block.entries.map((entry) => {
								const iconPath = modifierNameCandidates(entry)
									.map(getIconPath)
									.find(Boolean);
								return iconPath ? { ...entry, iconPath } : entry;
							}),
						}
					: block,
			),
		};
	});
}
