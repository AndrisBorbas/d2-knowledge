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
];
