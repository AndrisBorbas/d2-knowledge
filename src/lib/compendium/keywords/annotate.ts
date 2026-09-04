import { type SheetColorIndex, sheetColorKey } from "@/lib/ddc/api";

import type {
	AnnotatedAlternateDescription,
	AnnotatedEntry,
	Annotation,
	DescriptionSegment,
	Entry,
	Keyword,
} from "../model";
import {
	caseInsensitiveTitleTerms,
	extraAliases,
	neverLinkedTerms,
	noPluralTerms,
	protectedPhrases,
	Verbs,
} from "./data";
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
	// One-word proper nouns only match text that capitalizes them too, see
	// `buildKeywordTerms`.
	requireCapitalized: boolean;
};

const NEVER_LINKED_TERMS = new Set(
	neverLinkedTerms.map((term) => term.toLowerCase()),
);

const CASE_INSENSITIVE_TITLE_TERMS = new Set(
	caseInsensitiveTitleTerms.map((term) => term.toLowerCase()),
);

// A term has to be worth matching on: the compendium has an entry titled "-",
// and a one-character term would otherwise annotate every hyphen in the corpus.
function isLinkableTerm(term: string) {
	return term.trim().length > 1 && /[a-z0-9]/i.test(term);
}

export function buildKeywords(
	entries: Entry[],
	resolveGlyphIcon?: (className: string) => string | undefined,
) {
	const map = new Map<string, Keyword>();

	for (const entry of entries) {
		const label = entry.title.trim();
		if (!isLinkableTerm(label)) continue;
		if (NEVER_LINKED_TERMS.has(label.toLowerCase())) continue;

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

	addEntryKeywordAliases(entries, map);

	return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// Second pass on purpose: an entry-supplied alias may name a perk that has its
// own entry further down the list (Skyburner Catalyst grants Incandescent), and
// that entry is the one the term should open. So aliases are only handed out
// once every title has claimed its keyword, and a term that is already spoken
// for - by a title, by a verb alias, or by an earlier entry's alias - is
// dropped rather than fought over.
function addEntryKeywordAliases(entries: Entry[], map: Map<string, Keyword>) {
	const taken = new Set(map.keys());
	for (const keyword of map.values()) {
		for (const alias of keyword.aliases) {
			taken.add(toSlug(alias));
		}
	}

	for (const entry of entries) {
		if (!entry.keywordAliases?.length) continue;

		const keyword = map.get(toSlug(entry.title.trim()));
		if (!keyword) continue;

		for (const alias of entry.keywordAliases) {
			const aliasSlug = toSlug(alias);
			if (!aliasSlug || taken.has(aliasSlug)) continue;
			taken.add(aliasSlug);
			keyword.aliases.push(alias);
		}
	}
}

// A keyword the curated verb lists never claimed is just an entry title, so it
// names a thing - a perk, a mod, an aspect - rather than describing an action.
// One-word names of that sort collide with ordinary English constantly
// ("no longer surrounded", "can overflow the magazine"), and the descriptions
// capitalize a name every time they actually mean it, so demanding a capital
// costs almost nothing and removes most of the noise. Curated verbs keep
// matching either way: "freeze" is lowercase as often as not.
// Only the leading letter is checked, never the rest: the sources disagree with
// themselves about the inner capitals of hyphenated names ("Barri-nade" is
// written "Barri-Nade" in the very text that defines it), and that disagreement
// says nothing about whether the name was meant.
function requiresCapitalizedMatch(keyword: Keyword, term: string) {
	if (keyword.types.length !== 1 || keyword.types[0] !== "default") {
		return false;
	}
	const trimmed = term.trim();
	if (trimmed.split(/\s+/).length !== 1) return false;
	if (!/^[A-Z]/.test(trimmed)) return false;
	return !CASE_INSENSITIVE_TITLE_TERMS.has(trimmed.toLowerCase());
}

export function buildKeywordTerms(keywords: Keyword[]): KeywordMatchTerm[] {
	const terms: KeywordMatchTerm[] = [];
	for (const keyword of keywords) {
		for (const term of [keyword.label, ...keyword.aliases]) {
			if (!isLinkableTerm(term)) continue;
			terms.push({
				keywordId: keyword.id,
				term,
				requireCapitalized: requiresCapitalizedMatch(keyword, term),
			});
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

// Descriptions say "healing grenades" as readily as "healing grenade", and the
// trailing-boundary lookahead below rejects the `s`, so the plural went
// unannotated. The suffix is part of the matched group, not a lookahead, so the
// whole word ends up inside one annotation span instead of leaving an orphan
// letter outside the link.
const NO_PLURAL_TERMS = new Set(
	noPluralTerms.map((term) => term.toLowerCase()),
);

export function buildTermPattern(term: string) {
	if (NO_PLURAL_TERMS.has(term.toLowerCase())) {
		return escapeRegExp(term);
	}
	// ability -> abilities
	if (/[^aeiou]y$/i.test(term)) {
		return `${escapeRegExp(term.slice(0, -1))}(?:y|ies)`;
	}
	// boss -> bosses, punch -> punches
	if (/(?:s|x|z|ch|sh)$/i.test(term)) {
		return `${escapeRegExp(term)}(?:es)?`;
	}
	return `${escapeRegExp(term)}s?`;
}

// Spans of text that spell out a longer name which merely contains a keyword.
// Nothing is annotated inside them, so "Flinch Resistance" stays a stat instead
// of linking to the Resistance chest mod.
function findProtectedRanges(text: string) {
	const ranges: { start: number; end: number }[] = [];

	for (const phrase of protectedPhrases) {
		const pattern = new RegExp(
			`(^|[^A-Za-z0-9])(${buildTermPattern(phrase)})(?=$|[^A-Za-z0-9])`,
			"gi",
		);

		let match = pattern.exec(text);
		while (match) {
			const start = match.index + (match[1] ?? "").length;
			ranges.push({ start, end: start + (match[2] ?? "").length });
			match = pattern.exec(text);
		}
	}

	return ranges;
}

export function annotateText(text: string, terms: KeywordMatchTerm[]) {
	const candidates: Annotation[] = [];
	const protectedRanges = findProtectedRanges(text);

	for (const term of terms) {
		const pattern = new RegExp(
			`(^|[^A-Za-z0-9])(${buildTermPattern(term.term)})(?=$|[^A-Za-z0-9])`,
			"gi",
		);

		let match = pattern.exec(text);
		while (match) {
			const matchedText = match[2] ?? "";
			const leadingLength = (match[1] ?? "").length;
			const start = match.index + leadingLength;
			const end = start + matchedText.length;

			// A candidate that spans the whole protected phrase is the longer name
			// itself ("Melee Damage Resistance"), so it is what the phrase was
			// protecting the text for.
			const isProtected = protectedRanges.some(
				(range) =>
					intersects(range, { start, end }) &&
					!(start <= range.start && end >= range.end),
			);
			const isMiscased = term.requireCapitalized && !/^[A-Z]/.test(matchedText);
			if (!isProtected && !isMiscased) {
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
	text: string,
	segments: DescriptionSegment[] | undefined,
	sheetColors: SheetColorIndex,
	blockers: { start: number; end: number }[],
): Annotation[] {
	const results: Annotation[] = [];

	for (const segment of segments ?? []) {
		const cell = sheetColors.get(
			sheetColorKey(
				segment.source.tab,
				segment.source.row,
				segment.source.column,
			),
		);
		if (!cell) continue;

		const segmentText = text.slice(
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
					text: text.slice(piece.start, piece.end),
					color: run.color,
				});
			}
		}
	}

	return results;
}

// Keyword pass, then patterns carved around the keywords, then sheet colors
// carved around both. Every offset it returns indexes into `text` alone.
function annotateBody(
	text: string,
	segments: DescriptionSegment[] | undefined,
	terms: KeywordMatchTerm[],
	sheetColors: SheetColorIndex,
): Annotation[] {
	const keywordAnnotations = annotateText(text, terms);
	const patternAnnotations = annotatePatterns(text).filter(
		(pattern) =>
			!keywordAnnotations.some((keyword) => intersects(keyword, pattern)),
	);
	const sheetColorAnnotations = buildSheetColorAnnotations(
		text,
		segments,
		sheetColors,
		[...keywordAnnotations, ...patternAnnotations],
	);

	return [
		...keywordAnnotations,
		...patternAnnotations,
		...sheetColorAnnotations,
	].sort((a, b) => a.start - b.start);
}

export function annotateEntries(
	entries: Entry[],
	keywords: Keyword[],
	sheetColors: SheetColorIndex = new Map(),
) {
	const terms = buildKeywordTerms(keywords);
	return entries.map((entry): AnnotatedEntry => {
		const alternateDescriptions: AnnotatedAlternateDescription[] | undefined =
			entry.alternateDescriptions?.map((alternate) => ({
				...alternate,
				annotations: annotateBody(
					alternate.text,
					alternate.descriptionSegments,
					terms,
					sheetColors,
				),
			}));

		return {
			...entry,
			annotations: annotateBody(
				entry.description,
				entry.descriptionSegments,
				terms,
				sheetColors,
			),
			officialAnnotations: annotateDescription(
				entry.officialDescription,
				terms,
			),
			alternateDescriptions,
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
