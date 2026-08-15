import { type SheetColorIndex, sheetColorKey } from "@/lib/sheet/api";

import type {
	AnnotatedEntry,
	Annotation,
	Entry,
	Keyword,
	KeywordCategory,
} from "../model";
import { extraAliases, Verbs } from "./data";
import { annotatePatterns } from "./patterns";

const ELEMENT_TERMS = new Set([
	"arc",
	"solar",
	"void",
	"stasis",
	"strand",
	"prismatic",
	"kinetic",
]);

const WEAPON_TERMS = [
	"rifle",
	"launcher",
	"shotgun",
	"sniper",
	"sword",
	"glaive",
	"bow",
	"trace",
	"machine gun",
];

const STATUS_TERMS = [
	"jolt",
	"weaken",
	"volatile",
	"freeze",
	"slow",
	"scorch",
	"radiant",
	"amplified",
	"devour",
	"unravel",
	"suspend",
	"sever",
	"blind",
];

export function toSlug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export type KeywordMatchTerm = {
	keywordId: string;
	term: string;
};

export function buildKeywords(
	entries: Entry[],
	resolveGlyphIcon?: (className: string) => string | undefined,
) {
	const map = new Map<string, Keyword>();

	for (const entry of entries) {
		const label = entry.title.trim();
		if (!label) continue;

		const id = toSlug(label);
		const existing = map.get(id);
		if (!existing) {
			const verb = Verbs.find((verb) => toSlug(verb.name) === id);
			const extraAlias = extraAliases.find(
				(entry) => toSlug(entry.name) === id,
			);
			const elementType = verb?.types.find((type) =>
				ELEMENT_TERMS.has(type.toLowerCase()),
			);
			const types = [];
			types.push(...(verb?.types ?? []));
			types.push(...(extraAlias?.types ?? []));
			if (elementType) {
				types.push(elementType);
			}
			map.set(id, {
				id,
				label,
				aliases: [...(verb?.aliases ?? []), ...(extraAlias?.aliases ?? [])],
				types: types.length > 0 ? types : ["default"],
				variant: "default",
				references: [entry.id],
				iconPath: elementType
					? resolveGlyphIcon?.(elementType.toLowerCase())
					: undefined,
			});
			continue;
		}

		if (!existing.references.includes(entry.id)) {
			existing.references.push(entry.id);
		}
	}

	return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function buildKeywordTerms(keywords: Keyword[]): KeywordMatchTerm[] {
	const terms: KeywordMatchTerm[] = [];
	for (const keyword of keywords) {
		terms.push({ keywordId: keyword.id, term: keyword.label });
		for (const alias of keyword.aliases) {
			terms.push({ keywordId: keyword.id, term: alias });
		}
	}

	terms.sort((a, b) => b.term.length - a.term.length);
	return terms;
}

export function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function intersects(
	a: { start: number; end: number },
	b: { start: number; end: number },
) {
	return a.start < b.end && b.start < a.end;
}

export function annotateText(text: string, terms: KeywordMatchTerm[]) {
	const candidates: Annotation[] = [];

	for (const term of terms) {
		const pattern = new RegExp(
			`(^|[^A-Za-z0-9])(${escapeRegExp(term.term)})(?=$|[^A-Za-z0-9])`,
			"gi",
		);

		let match = pattern.exec(text);
		while (match) {
			const matchedText = match[2] ?? "";
			const leadingLength = (match[1] ?? "").length;
			const start = match.index + leadingLength;
			const end = start + matchedText.length;

			if (matchedText.length > 1) {
				candidates.push({
					keywordId: term.keywordId,
					start,
					end,
					text: text.slice(start, end),
				});
			}

			match = pattern.exec(text);
		}
	}

	candidates.sort((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		return b.end - b.start - (a.end - a.start);
	});

	const accepted: Annotation[] = [];
	for (const candidate of candidates) {
		const hasOverlap = accepted.some((item) => intersects(item, candidate));
		if (!hasOverlap) {
			accepted.push(candidate);
		}
	}

	return accepted;
}

// Splits `range` into the sub-ranges not covered by any `blockers` range,
// so a small keyword/pattern match in the middle of a long sheet-colored
// sentence only carves out its exact span instead of discarding the whole
// sentence's color.
function subtractIntervals(
	range: { start: number; end: number },
	blockers: { start: number; end: number }[],
): { start: number; end: number }[] {
	const relevant = blockers
		.filter((blocker) => intersects(range, blocker))
		.sort((a, b) => a.start - b.start);

	const pieces: { start: number; end: number }[] = [];
	let cursor = range.start;

	for (const blocker of relevant) {
		const blockerStart = Math.max(blocker.start, range.start);
		const blockerEnd = Math.min(blocker.end, range.end);
		if (blockerStart > cursor) {
			pieces.push({ start: cursor, end: blockerStart });
		}
		cursor = Math.max(cursor, blockerEnd);
	}

	if (cursor < range.end) {
		pieces.push({ start: cursor, end: range.end });
	}

	return pieces;
}

function buildSheetColorAnnotations(
	entry: Entry,
	sheetColors: SheetColorIndex,
	blockers: { start: number; end: number }[],
): Annotation[] {
	const results: Annotation[] = [];

	for (const segment of entry.descriptionSegments ?? []) {
		const cell = sheetColors.get(
			sheetColorKey(
				segment.source.tab,
				segment.source.row,
				segment.source.column,
			),
		);
		if (!cell) continue;

		const segmentText = entry.description.slice(
			segment.start,
			segment.start + segment.length,
		);
		const cellOffset = cell.text.indexOf(segmentText);
		if (cellOffset === -1) continue;

		for (const run of cell.runs) {
			if (!run.color) continue;

			const runStartInCell = Math.max(run.start, cellOffset);
			const runEndInCell = Math.min(run.end, cellOffset + segmentText.length);
			if (runStartInCell >= runEndInCell) continue;

			const start = segment.start + (runStartInCell - cellOffset);
			const end = segment.start + (runEndInCell - cellOffset);

			const pieces = subtractIntervals({ start, end }, blockers);
			for (const piece of pieces) {
				results.push({
					keywordId: `sheet-color:${segment.source.tab}:${segment.source.row}:${segment.source.column}:${run.start}:${piece.start}`,
					start: piece.start,
					end: piece.end,
					text: entry.description.slice(piece.start, piece.end),
					color: run.color,
				});
			}
		}
	}

	return results;
}

export function annotateEntries(
	entries: Entry[],
	keywords: Keyword[],
	sheetColors: SheetColorIndex = new Map(),
) {
	const terms = buildKeywordTerms(keywords);
	return entries.map((entry): AnnotatedEntry => {
		const keywordAnnotations = annotateText(entry.description, terms);
		const patternAnnotations = annotatePatterns(entry.description).filter(
			(pattern) =>
				!keywordAnnotations.some((keyword) => intersects(keyword, pattern)),
		);
		const sheetColorAnnotations = buildSheetColorAnnotations(
			entry,
			sheetColors,
			[...keywordAnnotations, ...patternAnnotations],
		);

		return {
			...entry,
			annotations: [
				...keywordAnnotations,
				...patternAnnotations,
				...sheetColorAnnotations,
			].sort((a, b) => a.start - b.start),
			officialAnnotations: annotateDescription(entry.officialDescription, terms),
		};
	});
}

// Keyword + pattern passes only: the official description comes from the Bungie
// manifest, so it has no sheet cells behind it and no rich-text colors to apply.
function annotateDescription(
	description: string | undefined,
	terms: KeywordMatchTerm[],
): Annotation[] | undefined {
	if (!description) return undefined;

	const keywordAnnotations = annotateText(description, terms);
	const patternAnnotations = annotatePatterns(description).filter(
		(pattern) =>
			!keywordAnnotations.some((keyword) => intersects(keyword, pattern)),
	);

	return [...keywordAnnotations, ...patternAnnotations].sort(
		(a, b) => a.start - b.start,
	);
}
