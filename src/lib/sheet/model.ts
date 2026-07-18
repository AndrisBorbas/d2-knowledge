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
});

export const entrySchema = z.object({
	id: z.string(),
	tab: z.string(),
	section: z.string().nullable(),
	source: sourceSpanSchema,
	title: z.string(),
	description: z.string(),
	extraInfo: z.string().optional(),
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
});

export const tabDataSchema = z.object({
	name: z.string(),
	entries: z.array(entrySchema),
});

export const annotatedTabDataSchema = z.object({
	name: z.string(),
	entries: z.array(annotatedEntrySchema),
});

export const compendiumDatasetSchema = z.object({
	generatedAt: z.string(),
	tabs: z.array(annotatedTabDataSchema),
	keywords: z.array(keywordSchema),
});

export type SourceSpan = z.infer<typeof sourceSpanSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type AnnotatedEntry = z.infer<typeof annotatedEntrySchema>;
export type KeywordCategory = z.infer<typeof keywordCategorySchema>;
export type Keyword = z.infer<typeof keywordSchema>;
export type TabData = z.infer<typeof tabDataSchema>;
export type AnnotatedTabData = z.infer<typeof annotatedTabDataSchema>;
export type CompendiumDataset = z.infer<typeof compendiumDatasetSchema>;
