import type { Annotation, Entry, Keyword, KeywordCategory } from "./model";

interface KeywordOverride {
	exclude?: boolean;
	aliases?: string[];
	category?: KeywordCategory;
}

const KEYWORD_OVERRIDES: Record<string, KeywordOverride> = {
	"orb of power": {
		aliases: ["orbs of power"],
		category: "mechanic",
	},
	"void breach": {
		aliases: ["void breaches"],
		category: "mechanic",
	},
	"ionic trace": {
		aliases: ["ionic traces"],
		category: "mechanic",
	},
	"stasis shard": {
		aliases: ["stasis shards"],
		category: "mechanic",
	},
	the: { exclude: true },
	image: { exclude: true },
};

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

function inferCategory(label: string): KeywordCategory {
	const normalized = label.toLowerCase();
	if (ELEMENT_TERMS.has(normalized)) return "element";
	if (WEAPON_TERMS.some((term) => normalized.includes(term))) return "weapon";
	if (STATUS_TERMS.some((term) => normalized.includes(term))) return "status";
	return "mechanic";
}

export interface KeywordMatchTerm {
	keywordId: string;
	term: string;
}

export function buildKeywords(entries: Entry[]) {
	const map = new Map<string, Keyword>();

	for (const entry of entries) {
		const label = entry.title.trim();
		if (!label) continue;

		const normalized = label.toLowerCase();
		const override = KEYWORD_OVERRIDES[normalized];
		if (override?.exclude) continue;

		const id = toSlug(normalized);
		const existing = map.get(id);
		if (!existing) {
			map.set(id, {
				id,
				label,
				aliases: override?.aliases ?? [],
				category: override?.category ?? inferCategory(label),
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
