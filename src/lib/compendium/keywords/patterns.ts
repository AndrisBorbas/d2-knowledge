import type { Annotation } from "../model";
import { escapeRegExp, intersects } from "./annotate";

// TODO: fill in real Tailwind color classes for each of these.
export const PATTERN_COLORS = {
	pveDamage: "text-pve-damage",
	pvpDamage: "text-pvp-damage",
	tierMinor: "text-tier-minor",
	tierElite: "text-tier-elite",
	tierMiniboss: "text-tier-miniboss",
	tierBoss: "text-tier-boss",
	tierGuardian: "text-tier-guardian",
	tierChampion: "text-tier-champion",
	energyGrenade: "text-energy-grenade",
	energyMelee: "text-energy-melee",
	energyClass: "text-energy-class",
	energySuper: "text-energy-super",
	energyAbility: "text-energy-ability",
	masterwork: "text-masterwork",
} as const;

// Numbers in the sheets are written by hand, so they carry thousands
// separators ("1,440"), approximation marks ("~35"), stack prefixes ("x40"),
// percentages and an "unknown" marker that can sit on either side of the
// percent sign ("?", "?%", "100?%", "75%?").
const NUMBER_LITERAL = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;
const VALUE_SUFFIX = String.raw`(?:\?%|%\?|%|\?)?`;
// The multiplier mark sits in front of stack counts ("x40") but behind
// scalars ("0.9x", "1.34x").
const VALUE = String.raw`(?:[~≈]?[+x×]?(?:${NUMBER_LITERAL})[x×]?|[+x×]?\?[x×]?)${VALUE_SUFFIX}`;

// Values are frequently combined into small equations: "1,440 x 2",
// "634 + 127 = 761", "x17+4.5", "4.25+?", "15-20%". The repetition is capped so
// a long numeric run that is not followed by a bracket cannot backtrack for
// ever.
const OPERATOR = String.raw`(?:\s*[+\-–—*/=]\s*|\s*×\s*|\s+x\s+)`;
const EXPRESSION = String.raw`(?:${VALUE})(?:${OPERATOR}(?:${VALUE})){0,6}`;

// A bracket counts as the PvP half when it is explicitly labelled ("[PVP: ?]",
// "[PVP: Slows for ? seconds]") or when its whole body is an equation
// ("[1,743]", "[x10+10]", "[105 + 47 = 152]"). Anything else is prose the
// sheets put in brackets for unrelated reasons: "[Reload]", "[Redacted]",
// "[2–3 Energy]", "[100? HP]", "[death]".
const PVP_BRACKET = String.raw`\[\s*(?:PVP\s*:\s*[^\[\]]*|${EXPRESSION}\s*)\]`;

// "1,280 [2,000] [448 [700]]": the sheets nest a second bracket when a value
// has two PvE variants, and the outer bracket then holds both PvP variants in
// the same order. The whole second group is PvP, so the first bracket has to
// stay PvE instead of being read as the PvP half.
const NESTED_DAMAGE_GROUP = new RegExp(
	`(${EXPRESSION}\\s*\\[\\s*${EXPRESSION}\\s*\\])\\s*(\\[\\s*${EXPRESSION}\\s*\\[\\s*${EXPRESSION}\\s*\\]\\s*\\])`,
	"gi",
);

// e.g. "35% [12%]", "+20 [PVP: 4000%]", "1,440 x 2 [300?]"
const PVE_PVP_PAIR = new RegExp(`(${EXPRESSION})(\\s*)(${PVP_BRACKET})`, "gi");

// Standalone bracket with no leading PvE value, e.g. "varying [162]".
const PVP_BRACKET_ONLY = new RegExp(PVP_BRACKET, "gi");

// "x2 = 40% [?%]" and "per pellet x 4 = 452 [115.2]" label the stack or hit
// count rather than multiplying, so the label is not part of the PvE value.
// "634 + 127 = 761 [...]" keeps its whole equation: only a single value in
// front of the "=" and marked with an "x" reads as a label.
const STACK_LABEL_PREFIX = /^[x×]?\s*\d+(?:\.\d+)?\s*=\s*/i;
const TRAILING_STACK_MARKER = /(?:^|[^a-z0-9])[x×]\s*$/i;

function stackLabelLength(text: string, start: number, value: string) {
	const label = STACK_LABEL_PREFIX.exec(value)?.[0];
	if (!label) return 0;
	if (/^[x×]/i.test(label)) return label.length;
	return TRAILING_STACK_MARKER.test(text.slice(0, start)) ? label.length : 0;
}

// Bare side markers used as headings, e.g. "[PVE] 16.2% | 21.7% | ...".
const SIDE_LABEL = /\[\s*(PVE|PVP)\s*\]/gi;

type TermColor = { term: string; colorClass: string; notFollowedBy?: string[] };

// Longest term first so e.g. "Overload Champion" wins over bare "Champion".
const ENEMY_TIER_TERMS: TermColor[] = [
	{
		term: "Overload Champion",
		colorClass: PATTERN_COLORS.tierChampion,
	},
	{ term: "Overload Champions", colorClass: PATTERN_COLORS.tierChampion },
	{
		term: "Unstoppable Champion",
		colorClass: PATTERN_COLORS.tierChampion,
	},
	{
		term: "Unstoppable Champions",
		colorClass: PATTERN_COLORS.tierChampion,
	},
	{ term: "Barrier Champion", colorClass: PATTERN_COLORS.tierChampion },
	{
		term: "Barrier Champions",
		colorClass: PATTERN_COLORS.tierChampion,
	},
	{ term: "Champion", colorClass: PATTERN_COLORS.tierChampion },
	{ term: "Champions", colorClass: PATTERN_COLORS.tierChampion },
	{ term: "Miniboss", colorClass: PATTERN_COLORS.tierMiniboss },
	{ term: "Minibosses", colorClass: PATTERN_COLORS.tierMiniboss },
	{ term: "Minor", colorClass: PATTERN_COLORS.tierMinor },
	{ term: "Minors", colorClass: PATTERN_COLORS.tierMinor },
	{ term: "Rank-And-File", colorClass: PATTERN_COLORS.tierMinor },
	{ term: "Elite", colorClass: PATTERN_COLORS.tierElite },
	{ term: "Elites", colorClass: PATTERN_COLORS.tierElite },
	{ term: "Elite+", colorClass: PATTERN_COLORS.tierElite },
	{ term: "Boss", colorClass: PATTERN_COLORS.tierBoss },
	{ term: "Bosses", colorClass: PATTERN_COLORS.tierBoss },
	{ term: "Guardian", colorClass: PATTERN_COLORS.tierGuardian },
	{ term: "Guardians", colorClass: PATTERN_COLORS.tierGuardian },
];

const ABILITY_ENERGY_TERMS: TermColor[] = [
	{ term: "Grenade Ability Energy", colorClass: PATTERN_COLORS.energyGrenade },
	{ term: "Grenade Ability", colorClass: PATTERN_COLORS.energyGrenade },
	{ term: "Grenade Energy", colorClass: PATTERN_COLORS.energyGrenade },
	{
		term: "Grenade",
		colorClass: PATTERN_COLORS.energyGrenade,
		notFollowedBy: ["Launcher", "Launchers"],
	},
	{ term: "Melee Ability Energy", colorClass: PATTERN_COLORS.energyMelee },
	{ term: "Melee Ability", colorClass: PATTERN_COLORS.energyMelee },
	{ term: "Melee Energy", colorClass: PATTERN_COLORS.energyMelee },
	{ term: "Melee", colorClass: PATTERN_COLORS.energyMelee },
	{ term: "Class Ability Energy", colorClass: PATTERN_COLORS.energyClass },
	{ term: "Class Ability", colorClass: PATTERN_COLORS.energyClass },
	{ term: "Class Energy", colorClass: PATTERN_COLORS.energyClass },
	{ term: "Class", colorClass: PATTERN_COLORS.energyClass },
	{ term: "Super Ability Energy", colorClass: PATTERN_COLORS.energySuper },
	{ term: "Super Ability", colorClass: PATTERN_COLORS.energySuper },
	{ term: "Super Energy", colorClass: PATTERN_COLORS.energySuper },
	{ term: "Super", colorClass: PATTERN_COLORS.energySuper },
	{ term: "Ability Energy", colorClass: PATTERN_COLORS.energyAbility },
];

function buildTermAnnotations(text: string, terms: TermColor[]): Annotation[] {
	const candidates: Annotation[] = [];

	for (const { term, colorClass, notFollowedBy } of terms) {
		const exclusion = notFollowedBy?.length
			? `(?!\\s*(?:${notFollowedBy.map(escapeRegExp).join("|")})\\b)`
			: "";
		const pattern = new RegExp(
			`(^|[^A-Za-z0-9])(${escapeRegExp(term)})${exclusion}(?=$|[^A-Za-z0-9])`,
			"gi",
		);

		let match = pattern.exec(text);
		while (match) {
			const matchedText = match[2] ?? "";
			const start = match.index + (match[1] ?? "").length;
			const end = start + matchedText.length;

			candidates.push({
				keywordId: `pattern:${colorClass}`,
				start,
				end,
				text: text.slice(start, end),
				colorClass,
			});

			match = pattern.exec(text);
		}
	}

	candidates.sort((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		return b.end - b.start - (a.end - a.start);
	});

	const accepted: Annotation[] = [];
	for (const candidate of candidates) {
		if (!accepted.some((item) => intersects(item, candidate))) {
			accepted.push(candidate);
		}
	}

	return accepted;
}

const MASTERWORK_ARROW = /🡅/g;

function buildMasterworkArrowAnnotations(text: string): Annotation[] {
	const accepted: Annotation[] = [];

	let match = MASTERWORK_ARROW.exec(text);
	while (match) {
		const start = match.index;
		const end = start + match[0].length;

		accepted.push({
			keywordId: `pattern:${PATTERN_COLORS.masterwork}`,
			start,
			end,
			text: match[0],
			colorClass: PATTERN_COLORS.masterwork,
		});

		match = MASTERWORK_ARROW.exec(text);
	}

	return accepted;
}

function buildDamagePairAnnotations(text: string): Annotation[] {
	const accepted: Annotation[] = [];

	const push = (start: number, end: number, colorClass: string) => {
		if (end <= start) return;
		const candidate = { start, end };
		if (accepted.some((item) => intersects(item, candidate))) return;
		accepted.push({
			keywordId: `pattern:${colorClass}`,
			start,
			end,
			text: text.slice(start, end),
			colorClass,
		});
	};

	// The nested form has to be consumed first: its first bracket would
	// otherwise be picked up as an ordinary PvP half.
	NESTED_DAMAGE_GROUP.lastIndex = 0;
	let nested = NESTED_DAMAGE_GROUP.exec(text);
	while (nested) {
		const pveText = nested[1] ?? "";
		const pvpText = nested[2] ?? "";
		const pveStart = nested.index;
		const pvpStart = nested.index + nested[0].lastIndexOf(pvpText);

		push(pveStart, pveStart + pveText.length, PATTERN_COLORS.pveDamage);
		push(pvpStart, pvpStart + pvpText.length, PATTERN_COLORS.pvpDamage);

		nested = NESTED_DAMAGE_GROUP.exec(text);
	}

	PVE_PVP_PAIR.lastIndex = 0;
	let match = PVE_PVP_PAIR.exec(text);
	while (match) {
		const pveText = match[1] ?? "";
		const gap = (match[2] ?? "").length;
		const pvpText = match[3] ?? "";
		const label = stackLabelLength(text, match.index, pveText);
		const pveStart = match.index + label;
		const pveEnd = match.index + pveText.length;
		const pvpStart = pveEnd + gap;

		push(pveStart, pveEnd, PATTERN_COLORS.pveDamage);
		push(pvpStart, pvpStart + pvpText.length, PATTERN_COLORS.pvpDamage);

		match = PVE_PVP_PAIR.exec(text);
	}

	PVP_BRACKET_ONLY.lastIndex = 0;
	let bracketMatch = PVP_BRACKET_ONLY.exec(text);
	while (bracketMatch) {
		const start = bracketMatch.index;
		push(start, start + bracketMatch[0].length, PATTERN_COLORS.pvpDamage);

		bracketMatch = PVP_BRACKET_ONLY.exec(text);
	}

	SIDE_LABEL.lastIndex = 0;
	let labelMatch = SIDE_LABEL.exec(text);
	while (labelMatch) {
		const start = labelMatch.index;
		const isPvp = (labelMatch[1] ?? "").toLowerCase() === "pvp";
		push(
			start,
			start + labelMatch[0].length,
			isPvp ? PATTERN_COLORS.pvpDamage : PATTERN_COLORS.pveDamage,
		);

		labelMatch = SIDE_LABEL.exec(text);
	}

	return accepted.sort((a, b) => a.start - b.start);
}

export function annotatePatterns(text: string): Annotation[] {
	const damage = buildDamagePairAnnotations(text);
	// An arrow can sit inside a PvP bracket ("[PVP: 🡅6.25%]"); the renderer
	// walks annotations with a single cursor, so an overlap would print the
	// arrow twice.
	const masterwork = buildMasterworkArrowAnnotations(text).filter(
		(item) => !damage.some((d) => intersects(d, item)),
	);
	const tiers = buildTermAnnotations(text, ENEMY_TIER_TERMS).filter(
		(item) => !damage.some((d) => intersects(d, item)),
	);
	const energy = buildTermAnnotations(text, ABILITY_ENERGY_TERMS).filter(
		(item) =>
			!damage.some((d) => intersects(d, item)) &&
			!tiers.some((t) => intersects(t, item)),
	);

	return [...damage, ...masterwork, ...tiers, ...energy].sort(
		(a, b) => a.start - b.start,
	);
}
