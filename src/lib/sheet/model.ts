import { z } from "zod";

export const sourceSpanSchema = z.object({
	tab: z.string(),
	row: z.number().int().nonnegative(),
	column: z.number().int().nonnegative(),
});

export const annotationSchema = z.object({
	keywordId: z.string(),
	start: z.number().int().nonnegative(),
	end: z.number().int().positive(),
	text: z.string(),
	// Present => render as a plain colored span (pattern match), not a keyword TooltipButton.
	colorClass: z.string().optional(),
});

export const iconGlyphSchema = z.object({
	label: z.string(),
	iconPath: z.string(),
});

export const unifiedSourceIdSchema = z.enum([
	"sheet",
	"foundry",
	"bungie",
	"manual",
]);

export const unifiedEntryKindSchema = z.enum([
	"armor_set_bonus",
	"weapon_perk_or_verb",
	"ability",
	"artifact_perk",
	"exotic_item_perk",
	"general",
]);

export const unifiedSourceRefSchema = z.object({
	sourceId: unifiedSourceIdSchema,
	sourceKey: z.string(),
	tab: z.string().optional(),
	row: z.number().int().nonnegative().optional(),
	column: z.number().int().nonnegative().optional(),
	hash: z.number().int().nonnegative().optional(),
	itemHash: z.number().int().nonnegative().optional(),
	itemName: z.string().optional(),
	type: z.string().optional(),
	updatedAt: z.number().int().nonnegative().optional(),
});

export const entrySchema = z.object({
	id: z.string(),
	tab: z.string(),
	section: z.string().nullable(),
	groups: z.array(z.string()),
	source: sourceSpanSchema,
	title: z.string(),
	description: z.string(),
	extraInfo: z.string().optional(),
	kind: unifiedEntryKindSchema.optional(),
	sourceId: unifiedSourceIdSchema.optional(),
	sourceRefs: z.array(unifiedSourceRefSchema).optional(),
	secondaryName: z.string().optional(),
	iconPath: z.string().optional(),
	secondaryIconPath: z.string().optional(),
	itemHash: z.number().int().nonnegative().optional(),
	perkHash: z.number().int().nonnegative().optional(),
	iconGlyphs: z.array(iconGlyphSchema).optional(),
});

export const annotatedEntrySchema = entrySchema.extend({
	annotations: z.array(annotationSchema),
});

export const keywordCategorySchema = z.enum([
	"element",
	"weapon",
	"status",
	"mechanic",
]);

export const keywordVariantSchema = z.enum([
	"default",
	"arc",
	"solar",
	"void",
	"stasis",
	"strand",
	"prismatic",
	"masterwork",
]);

export const keywordSchema = z.object({
	id: z.string(),
	label: z.string(),
	aliases: z.array(z.string()),
	types: z.array(z.string()),
	variant: keywordVariantSchema,
	references: z.array(z.string()),
	iconPath: z.string().optional(),
});

export const tabDataSchema = z.object({
	name: z.string(),
	entries: z.array(entrySchema),
});

export const compendiumDatasetSchema = z.object({
	generatedAt: z.string(),
	entries: z.array(annotatedEntrySchema),
	keywords: z.array(keywordSchema),
});

export type SourceSpan = z.infer<typeof sourceSpanSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type IconGlyph = z.infer<typeof iconGlyphSchema>;
export type UnifiedSourceId = z.infer<typeof unifiedSourceIdSchema>;
export type UnifiedEntryKind = z.infer<typeof unifiedEntryKindSchema>;
export type UnifiedSourceRef = z.infer<typeof unifiedSourceRefSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type AnnotatedEntry = z.infer<typeof annotatedEntrySchema>;
export type KeywordCategory = z.infer<typeof keywordCategorySchema>;
export type Keyword = z.infer<typeof keywordSchema>;
export type TabData = z.infer<typeof tabDataSchema>;
export type CompendiumDataset = z.infer<typeof compendiumDatasetSchema>;
