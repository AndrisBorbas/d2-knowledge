import { Verbs } from "~/lib/data/glossary";

import type { Annotation, Entry, Keyword, KeywordCategory } from "./model";

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

function toSlug(value: string) {
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

export function buildKeywords(entries: Entry[]) {
	const map = new Map<string, Keyword>();

	for (const entry of entries) {
		const label = entry.title.trim();
		if (!label) continue;

		const id = toSlug(label);
		const existing = map.get(id);
		if (!existing) {
			const verb = Verbs.find((verb) => toSlug(verb.name) === id);
			map.set(id, {
				id,
				label,
				aliases: verb?.aliases ?? [],
				types: verb?.types ?? ["default"],
				references: [entry.id],
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

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function intersects(
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

export function annotateEntries(entries: Entry[], keywords: Keyword[]) {
	const terms = buildKeywordTerms(keywords);
	return entries.map((entry) => ({
		...entry,
		annotations: annotateText(entry.description, terms),
	}));
}
