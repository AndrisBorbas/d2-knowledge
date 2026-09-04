export type Verb = {
	name: string;
	types: string[];
	aliases?: string[];
};

export const Verbs: Verb[] = [
	// Arc
	{ name: "Amplified", types: ["Arc", "Buff"] },
	{ name: "Bolt Charge", types: ["Arc", "Buff"], aliases: ["Bolt Charges"] },
	{
		name: "Ionic Trace",
		types: ["Arc", "Elemental Pickup"],
		aliases: ["Ionic Traces"],
	},
	{ name: "Blind", types: ["Arc", "Debuff"], aliases: ["Blinded", "Blinding"] },
	{ name: "Jolted", types: ["Arc", "Debuff"], aliases: ["Jolt", "Jolting"] },
	// Solar
	{ name: "Cure", types: ["Solar", "Buff"], aliases: ["Cured", "Curing"] },
	{
		name: "Firesprite",
		types: ["Solar", "Elemental Pickup"],
		aliases: ["Firesprites"],
	},
	{ name: "Radiant", types: ["Solar", "Buff"] },
	{ name: "Restoration", types: ["Solar", "Buff"] },
	{
		name: "Ignition",
		types: ["Solar", "Debuff"],
		aliases: ["Ignited", "Igniting"],
	},
	{
		name: "Scorch",
		types: ["Solar", "Debuff"],
		aliases: ["Scorched", "Schorching"],
	},
	// Void
	{ name: "Devour", types: ["Void", "Buff"] },
	{ name: "Invisibility", types: ["Void", "Buff"], aliases: ["Invisible"] },
	{ name: "Overshield", types: ["Void", "Buff"] },
	{
		name: "Void Breach",
		types: ["Void", "Elemental Pickup"],
		aliases: ["Void Breaches"],
	},
	{
		name: "Suppression",
		types: ["Void", "Debuff"],
		aliases: ["Suppressed", "Suppressing"],
	},
	{ name: "Volatile", types: ["Void", "Debuff"] },
	{ name: "Volatile Rounds", types: ["Void", "Buff"] },
	{
		name: "Weaken",
		types: ["Void", "Debuff"],
		aliases: ["Weakened", "Weakening"],
	},
	// Stasis
	{
		name: "Stasis Shard",
		types: ["Stasis", "Elemental Pickup"],
		aliases: ["Stasis Shards"],
	},
	{
		name: "Stasis Crystal",
		types: ["Stasis", "Construct"],
		aliases: ["Stasis Crystals"],
	},
	{ name: "Frost Armor", types: ["Stasis", "Buff"] },
	{ name: "Slow", types: ["Stasis", "Debuff"], aliases: ["Slowed", "Slowing"] },
	{
		name: "Freeze",
		types: ["Stasis", "Debuff"],
		aliases: ["Frozen", "Freezing"],
	},
	{
		name: "Shatter",
		types: ["Stasis", "Debuff"],
		aliases: ["Shattered", "Shattering"],
	},
	// Strand
	{
		name: "Tangle",
		types: ["Strand", "Elemental Pickup"],
		aliases: ["Tangles"],
	},
	{ name: "Grapple Tangle", types: ["Strand"], aliases: ["Grapple Tangles"] },
	{
		name: "Threadling",
		types: ["Strand", "Construct"],
		aliases: ["Threadlings"],
	},
	{ name: "Woven Mail", types: ["Strand", "Buff"] },
	{ name: "Sever", types: ["Strand", "Debuff"], aliases: ["Severed"] },
	{
		name: "Suspend",
		types: ["Strand", "Debuff"],
		aliases: ["Suspended", "Suspends", "Suspension", "Suspending"],
	},
	{
		name: "Unravel",
		types: ["Strand", "Debuff"],
		aliases: ["Unraveled", "Unraveling Threads", "Thread", "Threads"],
	},
	{
		name: "Unraveling Rounds",
		types: ["Strand", "Buff"],
	},
	// Prismatic
	{
		name: "Transcendence",
		types: ["Prismatic", "Buff"],
		aliases: ["Transcendent"],
	},
	// General
] as const;

export const extraAliases: Verb[] = [
	{
		name: "Nanotech Tracer Missiles",
		aliases: ["Nanotech Tracer Rounds", "Nanotech Tracer Round"],
		types: ["Weapon"],
	},
	{
		name: "Marksman Sights",
		aliases: ["Marksman's Sights"],
		types: ["Weapon"],
	},
	{
		name: "That Fresh Bullets Smell",
		aliases: ["That Fresh Bullet Smell"],
		types: ["Artifact"],
	},
];

// Terms whose plural is an ordinary English word that has nothing to do with
// the perk - "at the edges", "the laws of physics", "elemental synergies".
// `buildTermPattern` matches these in the singular only.
export const noPluralTerms = ["Edge", "Physic", "Synergy"];

// Entry titles that read as ordinary English far more often than they name the
// thing they title - "damage at the edge of the radius", "once no longer
// surrounded", "Threadlings while in flight". Nothing in the corpus references
// the minor mods behind these words, so they get no keyword at all. The entries
// stay browsable and searchable; they just stop hijacking the prose.
export const neverLinkedTerms = ["Edge", "Surrounded", "Flight", "Synergy"];

// One-word entry titles are proper nouns, so they only match text that
// capitalizes them too (see `buildKeywordTerms`) - except these, which the
// descriptions write in lowercase as readily as in title case.
export const caseInsensitiveTitleTerms = ["Grapple"];

// Longer names that happen to contain a shorter keyword while meaning something
// else entirely: "Flinch Resistance" is a stat, not the Resistance chest mod,
// and Telesto's bolts are not crossbow Bolts. Keywords never match inside these
// spans. Names that have an entry of their own need no listing - the longest
// match already wins - so this is only for the ones the compendium never
// defines.
export const protectedPhrases = [
	"Damage Resistance",
	"Flinch Resistance",
	"Arc Bolts",
	"Light Bolts",
	"Lightning Bolts",
	"Telesto Bolts",
	"Void Bolts",
	"Godslayer Broadhead",
	"Handheld Supernova",
	"Voltaic Overflow",
	// Sic: the Dark Ether Reaper entry exists, but this description misspells
	// it, so the longest-match rule cannot protect the name here.
	"Dark Eather Reaper",
];

export const classNames = ["Hunter", "Titan", "Warlock"];
