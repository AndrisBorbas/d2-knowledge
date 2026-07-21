import { escapeRegExp, intersects } from "./keywords";
import type { Annotation } from "./model";

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
} as const;

const NUMBER = String.raw`[+]?\d+(?:\.\d+)?%?`;

// e.g. "35% [12%]", "+20 [PVP: 4000%]", "35 [PVP: ?]"
const PVE_PVP_PAIR = new RegExp(
	`(${NUMBER})\\s*(\\[\\s*(?:PVP:\\s*)?(?:${NUMBER}|\\?)\\s*\\])`,
	"gi",
);

// Standalone bracket with no leading PvE number, e.g. a lone "[PVP: 4000%]".
const PVP_BRACKET_ONLY = new RegExp(
	`\\[\\s*PVP:\\s*(?:${NUMBER}|\\?)\\s*\\]`,
	"gi",
);

type TermColor = { term: string; colorClass: string };

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
	{ term: "Grenade", colorClass: PATTERN_COLORS.energyGrenade },
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

	for (const { term, colorClass } of terms) {
		const pattern = new RegExp(
			`(^|[^A-Za-z0-9])(${escapeRegExp(term)})(?=$|[^A-Za-z0-9])`,
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

function buildDamagePairAnnotations(text: string): Annotation[] {
	const accepted: Annotation[] = [];

	let match = PVE_PVP_PAIR.exec(text);
	while (match) {
		const pveText = match[1] ?? "";
		const pvpText = match[2] ?? "";
		const pveStart = match.index;
		const pveEnd = pveStart + pveText.length;
		const pvpStart = match.index + match[0].lastIndexOf(pvpText);
		const pvpEnd = pvpStart + pvpText.length;

		accepted.push({
			keywordId: `pattern:${PATTERN_COLORS.pveDamage}`,
			start: pveStart,
			end: pveEnd,
			text: pveText,
			colorClass: PATTERN_COLORS.pveDamage,
		});
		accepted.push({
			keywordId: `pattern:${PATTERN_COLORS.pvpDamage}`,
			start: pvpStart,
			end: pvpEnd,
			text: pvpText,
			colorClass: PATTERN_COLORS.pvpDamage,
		});

		match = PVE_PVP_PAIR.exec(text);
	}

	let bracketMatch = PVP_BRACKET_ONLY.exec(text);
	while (bracketMatch) {
		const start = bracketMatch.index;
		const end = start + bracketMatch[0].length;
		const candidate = { start, end };

		if (!accepted.some((item) => intersects(item, candidate))) {
			accepted.push({
				keywordId: `pattern:${PATTERN_COLORS.pvpDamage}`,
				start,
				end,
				text: bracketMatch[0],
				colorClass: PATTERN_COLORS.pvpDamage,
			});
		}

		bracketMatch = PVP_BRACKET_ONLY.exec(text);
	}

	return accepted;
}

export function annotatePatterns(text: string): Annotation[] {
	const damage = buildDamagePairAnnotations(text);
	const tiers = buildTermAnnotations(text, ENEMY_TIER_TERMS).filter(
		(item) => !damage.some((d) => intersects(d, item)),
	);
	const energy = buildTermAnnotations(text, ABILITY_ENERGY_TERMS).filter(
		(item) =>
			!damage.some((d) => intersects(d, item)) &&
			!tiers.some((t) => intersects(t, item)),
	);

	return [...damage, ...tiers, ...energy].sort((a, b) => a.start - b.start);
}
