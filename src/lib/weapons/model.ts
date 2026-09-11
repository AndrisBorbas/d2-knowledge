import { z } from "zod";

// Schemas first, types after, the way `src/lib/compendium/model.ts` does it, so
// there is one source of truth for the shape written to disk and read back.

// The sheets write "INF", "N/A", "26.83%" and "167,925". A table should print
// what was written while still sorting numerically, so both travel.
export const numericCellSchema = z.object({
	raw: z.string(),
	value: z.number().nullable(),
});

export const tierRankSchema = z.enum(["S", "A", "B", "C", "D", "E", "F"]);

export const energyTypeSchema = z.enum([
	"Kinetic",
	"Arc",
	"Solar",
	"Void",
	"Stasis",
	"Strand",
]);

export const symbolRatingSchema = z.enum([
	"yes",
	"partial",
	"situational",
	"no",
]);

export const sourceRefSchema = z.object({
	tab: z.string(),
	row: z.number().int(),
	gid: z.number().int(),
});

export const weaponTierRowSchema = z.object({
	id: z.string(),
	tab: z.string(),
	categorySlug: z.string(),
	categoryLabel: z.string(),
	rank: z.number().int().nullable(),
	tier: tierRankSchema.nullable(),
	name: z.string(),
	// "Reckless Oracle\nPantheon version" keeps the qualifier out of the name.
	nameNote: z.string().optional(),
	season: z.number().int().nullable(),
	energy: energyTypeSchema.nullable(),
	frame: z.string().optional(),
	source: z.string().optional(),
	// The tier tabs' `Ammo` column is a reserves count, unlike the exotic tab's
	// `Ammo`, which names a slot. Different names so they cannot be confused.
	reserves: z.number().int().nullable(),
	enhanceable: z.boolean().nullable(),
	barrels: z.array(z.string()),
	magazines: z.array(z.string()),
	masterworks: z.array(z.string()),
	perks1: z.array(z.string()),
	perks2: z.array(z.string()),
	originTraits: z.array(z.string()),
	notes: z.string().optional(),
	// Sword and glaive columns, absent everywhere else.
	charge: z.number().nullable().optional(),
	impact: z.number().nullable().optional(),
	shield: z.number().nullable().optional(),
	// Filled in from the Archetypes tab where the frame matches.
	ammoSlot: z.string().optional(),
	archetypeId: z.string().optional(),
	iconPath: z.string().optional(),
	watermarkPath: z.string().optional(),
	ref: sourceRefSchema,
});

export const exoticWeaponRowSchema = z.object({
	id: z.string(),
	rank: z.number().int().nullable(),
	tier: tierRankSchema.nullable(),
	name: z.string(),
	season: z.number().int().nullable(),
	// Reserves on this tab, same as the tier tabs.
	reserves: z.number().int().nullable(),
	// "primary" / "special" / "power".
	slot: z.string().optional(),
	tags: z.array(z.string()),
	description: z.string().optional(),
	roam: symbolRatingSchema.nullable(),
	dps: symbolRatingSchema.nullable(),
	challenge: symbolRatingSchema.nullable(),
	speed: symbolRatingSchema.nullable(),
	usage: z.string().optional(),
	iconPath: z.string().optional(),
	watermarkPath: z.string().optional(),
	ref: sourceRefSchema,
});

// 42 columns of DPS math whose names drift as the sheet is maintained. Keyed
// records under the sheet's own banner groups, so a new column lands in the
// table instead of failing the build.
export const archetypeRowSchema = z.object({
	id: z.string(),
	// Weapon and frame together, which is how a tier row looks one of these up.
	// Not unique: two archetypes can share a frame name.
	matchKey: z.string(),
	weapon: z.string(),
	frame: z.string(),
	// The second and later lines of `Frame`, which name the roll the numbers
	// assume ("Jagged Edge + Impact, Pack Hunter").
	frameNote: z.string().optional(),
	ammoSlot: z.string().optional(),
	tier: tierRankSchema.nullable(),
	notes: z.string().optional(),
	values: z.record(z.string(), numericCellSchema),
	calculations: z.record(z.string(), numericCellSchema),
	ref: sourceRefSchema,
});

export const damageShotRowSchema = z.object({
	id: z.string(),
	weaponType: z.string(),
	subtype: z.string(),
	critShot: numericCellSchema,
	bodyShot: numericCellSchema,
	otherTicks: z.string().optional(),
	modifiers: z.string().optional(),
	visualValue: numericCellSchema,
	healthbarValue: numericCellSchema,
	critRatio: numericCellSchema,
	patch: z.string().optional(),
	ref: sourceRefSchema,
});

export const sustainedRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	// The `Name` cell is a weapon followed by the loadout the run assumed.
	loadout: z.string().optional(),
	slot: z.string().optional(),
	family: z.string().optional(),
	notes: z.string().optional(),
	distribution: z.string().optional(),
	peakRate: numericCellSchema,
	timeToEmpty: numericCellSchema,
	base: numericCellSchema,
	perk: numericCellSchema,
	surge: numericCellSchema,
	buff: numericCellSchema,
	debuff: numericCellSchema,
	total: numericCellSchema,
	dps: numericCellSchema,
	ref: sourceRefSchema,
});

export const bossRowSchema = z.object({
	id: z.string(),
	rank: z.number().int().nullable(),
	activity: z.string(),
	boss: z.string(),
	ingameHealth: numericCellSchema,
	effectiveHealth: numericCellSchema,
	species: z.string().optional(),
	mechanics: z.string().optional(),
	setup: z.string().optional(),
	adds: z.string().optional(),
	range: z.string().optional(),
	phase: z.string().optional(),
	clearableDps: numericCellSchema,
	onePhaseDps: numericCellSchema,
	onePhaseDescription: z.string().optional(),
	mods: z.array(z.string()),
	notes: z.string().optional(),
	ref: sourceRefSchema,
});

export const tabStatusSchema = z.object({
	tab: z.string(),
	updated: z.string(),
	status: z.string().optional(),
	news: z.string().optional(),
});

export const legendEntrySchema = z.object({
	symbol: z.string(),
	meaning: z.string(),
});

export const weaponCategorySchema = z.object({
	slug: z.string(),
	label: z.string(),
	tab: z.string(),
	gid: z.number().int(),
	count: z.number().int(),
});

export const weaponsDatasetSchema = z.object({
	generatedAt: z.string(),
	endgameGeneratedAt: z.string(),
	damageGeneratedAt: z.string(),
	categories: z.array(weaponCategorySchema),
	tierRows: z.array(weaponTierRowSchema),
	exotics: z.array(exoticWeaponRowSchema),
	archetypes: z.array(archetypeRowSchema),
	damageShots: z.array(damageShotRowSchema),
	sustained: z.array(sustainedRowSchema),
	bosses: z.array(bossRowSchema),
	status: z.array(tabStatusSchema),
	// The sheets' own wording for what the ranks and symbols mean, rather than
	// ours.
	tierLegend: z.array(legendEntrySchema),
	symbolLegend: z.array(legendEntrySchema),
	diagnostics: z.object({
		iconMisses: z.array(z.string()),
		archetypeMisses: z.array(z.string()),
		// Frames the sheet rates more than once, where nothing on the tier tab
		// says which of them a weapon is.
		ambiguousArchetypes: z.array(z.string()),
	}),
});

export type NumericCell = z.infer<typeof numericCellSchema>;
export type TierRank = z.infer<typeof tierRankSchema>;
export type EnergyType = z.infer<typeof energyTypeSchema>;
export type SymbolRating = z.infer<typeof symbolRatingSchema>;
export type WeaponTierRow = z.infer<typeof weaponTierRowSchema>;
export type ExoticWeaponRow = z.infer<typeof exoticWeaponRowSchema>;
export type ArchetypeRow = z.infer<typeof archetypeRowSchema>;
export type DamageShotRow = z.infer<typeof damageShotRowSchema>;
export type SustainedRow = z.infer<typeof sustainedRowSchema>;
export type BossRow = z.infer<typeof bossRowSchema>;
export type TabStatus = z.infer<typeof tabStatusSchema>;
export type LegendEntry = z.infer<typeof legendEntrySchema>;
export type WeaponCategory = z.infer<typeof weaponCategorySchema>;
export type WeaponsDataset = z.infer<typeof weaponsDatasetSchema>;
