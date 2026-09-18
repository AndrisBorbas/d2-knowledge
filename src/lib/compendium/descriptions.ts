import { getDescriptionOrder } from "./descriptionOrder";
import type {
	AnnotatedEntry,
	Annotation,
	DescriptionSegment,
	IconGlyph,
	UnifiedSourceId,
} from "./model";

// One renderable body of text. `annotations` and any inline glyph markers in
// `text` are in this block's own coordinate space - never mix them with
// another block's.
export type DescriptionBlock = {
	sourceId: UnifiedSourceId;
	text: string;
	annotations: Annotation[];
	iconGlyphs?: IconGlyph[];
	// Which spreadsheet tab the text came from. Only set for DDC bodies, and only
	// useful when one entry carries two of them (the Arc and Prismatic rows for
	// an aspect often word things differently).
	variantLabel?: string;
};

function toVariantLabel(segments: DescriptionSegment[] | undefined) {
	return segments?.[0]?.source.tab;
}

// Flattens the three places a description can live - the Bungie manifest text,
// the source that won the merge, and the sources that lost it - into one list
// ordered by the per-group config.
export function getDescriptionBlocks(
	entry: AnnotatedEntry,
): DescriptionBlock[] {
	const blocks: DescriptionBlock[] = [];

	if (entry.officialDescription?.trim()) {
		blocks.push({
			sourceId: "bungie",
			text: entry.officialDescription,
			annotations: entry.officialAnnotations ?? [],
			iconGlyphs: entry.iconGlyphs,
		});
	}

	if (entry.description.trim()) {
		blocks.push({
			sourceId: entry.sourceId ?? "ddc",
			text: entry.description,
			annotations: entry.annotations,
			iconGlyphs: entry.iconGlyphs,
			variantLabel: toVariantLabel(entry.descriptionSegments),
		});
	}

	for (const alternate of entry.alternateDescriptions ?? []) {
		if (!alternate.text.trim()) continue;
		blocks.push({
			sourceId: alternate.sourceId,
			text: alternate.text,
			annotations: alternate.annotations,
			iconGlyphs: alternate.iconGlyphs,
			variantLabel: toVariantLabel(alternate.descriptionSegments),
		});
	}

	const order = getDescriptionOrder(entry.groups);
	const rank = (sourceId: UnifiedSourceId) => {
		const index = order.indexOf(sourceId);
		return index === -1 ? order.length : index;
	};

	// Stable, so two blocks from the same source keep the order they were added.
	return blocks
		.map((block, index) => ({ block, index }))
		.sort(
			(left, right) =>
				rank(left.block.sourceId) - rank(right.block.sourceId) ||
				left.index - right.index,
		)
		.map(({ block }) => block);
}

// The sheet tabs one per subclass element. An aspect or ability that exists on
// an element and on Prismatic is written up on both tabs, often with different
// numbers.
const ELEMENT_TABS = new Set([
	"Arc",
	"Solar",
	"Void",
	"Stasis",
	"Strand",
	"Prismatic",
]);

// Keeps only the DDC bodies that describe the subclass being looked at. On the
// Prismatic Hunter page, Stylish Executioner shows its Prismatic row, not the
// Void one. With no row from that tab, rows from other element tabs go and
// generic ones stay (Thruster's "Class Abilities" row on Prismatic). If that
// would leave no DDC body at all, every one is kept.
export function selectDdcVariants(
	blocks: DescriptionBlock[],
	tab: string | undefined,
): DescriptionBlock[] {
	if (!tab) return blocks;
	const ddcBlocks = blocks.filter((block) => block.sourceId === "ddc");
	if (ddcBlocks.length < 2) return blocks;

	const matching = ddcBlocks.filter((block) => block.variantLabel === tab);
	const kept =
		matching.length > 0
			? matching
			: ddcBlocks.filter(
					(block) =>
						!block.variantLabel || !ELEMENT_TABS.has(block.variantLabel),
				);
	if (kept.length === 0) return blocks;

	return blocks.filter(
		(block) => block.sourceId !== "ddc" || kept.includes(block),
	);
}

// Reorders only the community ("extra info") bodies, in place: the in-game
// block - and any other non-toggleable source - keeps the slot the per-group
// config gave it, so a reader flipping this setting never moves the Bungie
// text. Stable, so two bodies from the same source keep their relative order.
export function orderExtraInfoBlocks(
	blocks: DescriptionBlock[],
	preferred: "clarity" | "ddc",
): DescriptionBlock[] {
	const slots: number[] = [];
	const extras: DescriptionBlock[] = [];

	blocks.forEach((block, index) => {
		if (block.sourceId !== "clarity" && block.sourceId !== "ddc") return;
		slots.push(index);
		extras.push(block);
	});

	if (extras.length < 2) return blocks;

	const reordered = [
		...extras.filter((block) => block.sourceId === preferred),
		...extras.filter((block) => block.sourceId !== preferred),
	];

	const result = [...blocks];
	slots.forEach((slot, index) => {
		result[slot] = reordered[index]!;
	});

	return result;
}
