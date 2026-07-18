export type Verb = {
	name: string;
	types: string[];
	aliases?: string[];
};

export type KeywordColor =
	| "default"
	| "arc"
	| "solar"
	| "void"
	| "stasis"
	| "strand"
	| "prismatic"
	| "masterwork";

export const Verbs: Verb[] = [
	// Arc
	{ name: "Amplified", types: ["Arc", "Buff"] },
	{ name: "Bolt Charge", types: ["Arc", "Buff"], aliases: ["Bolt Charges"] },
	{
		name: "Ionic Trace",
		types: ["Arc", "Elemental Pickup"],
		aliases: ["Ionic Traces"],
	},
	{ name: "Blind", types: ["Arc", "Debuff"], aliases: ["Blinded"] },
	{ name: "Jolted", types: ["Arc", "Debuff"], aliases: ["Jolt"] },
	// Solar
	{ name: "Cure", types: ["Solar", "Buff"], aliases: ["Cured"] },
	{
		name: "Firesprite",
		types: ["Solar", "Elemental Pickup"],
		aliases: ["Firesprites"],
	},
	{ name: "Radiant", types: ["Solar", "Buff"] },
	{ name: "Restoration", types: ["Solar", "Buff"] },
	{ name: "Ignition", types: ["Solar", "Debuff"], aliases: ["Ignited"] },
	{ name: "Scorch", types: ["Solar", "Debuff"], aliases: ["Scorched"] },
	// Void
	{ name: "Devour", types: ["Void", "Buff"] },
	{ name: "Invisibility", types: ["Void", "Buff"], aliases: ["Invisible"] },
	{ name: "Overshield", types: ["Void", "Buff"] },
	{
		name: "Void Breach",
		types: ["Void", "Elemental Pickup"],
		aliases: ["Void Breaches"],
	},
	{ name: "Suppression", types: ["Void", "Debuff"], aliases: ["Suppressed"] },
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
	{ name: "Slow", types: ["Stasis", "Debuff"], aliases: ["Slowed"] },
	{ name: "Freeze", types: ["Stasis", "Debuff"], aliases: ["Frozen"] },
	{ name: "Shatter", types: ["Stasis", "Debuff"], aliases: ["Shattered"] },
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
	{ name: "Suspend", types: ["Strand", "Debuff"], aliases: ["Suspended"] },
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

export function getKeywordColorFromTypes(types: string[]): KeywordColor {
	if (types.includes("Arc")) return "arc";
	if (types.includes("Solar")) return "solar";
	if (types.includes("Void")) return "void";
	if (types.includes("Stasis")) return "stasis";
	if (types.includes("Strand")) return "strand";
	if (types.includes("Prismatic")) return "prismatic";
	if (types.includes("Masterwork")) return "masterwork";
	return "default";
}

export function getClassFromColor(colors: KeywordColor): string {
	switch (colors) {
		case "arc":
			return "text-arc";
		case "solar":
			return "text-solar";
		case "void":
			return "text-void";
		case "stasis":
			return "text-stasis";
		case "strand":
			return "text-strand";
		case "prismatic":
			return "text-prismatic";
		case "masterwork":
			return "text-masterwork";
		default:
			return "text-foreground";
	}
}
