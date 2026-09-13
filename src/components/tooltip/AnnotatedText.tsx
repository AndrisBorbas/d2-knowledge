"use client";

import type { ReactNode } from "react";

import type {
	AnnotatedEntry,
	Annotation,
	Keyword,
} from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

import { TooltipButton } from "./TooltipButton";
import type { KeywordClickPayload, KeywordHoverPayload } from "./types";

// `TextWithTooltips` renders an entry's own description, so it can say which
// entry the text belongs to and leave a self-mention unlinked. This renders
// text that belongs to no entry - a spreadsheet cell the glossary matcher was
// run over - where every match is worth linking and the colour comes from the
// entry the keyword opens.
type AnnotatedTextProps = {
	text: string;
	// Offsets into `text`, from `buildWeaponPerkBundle`. Empty is fine and
	// simply prints the text.
	annotations: Annotation[];
	entryMap: Map<string, AnnotatedEntry>;
	keywordById: Map<string, Keyword>;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
	// The button sizes itself at `text-sm`; pass the surrounding size where the
	// text around it is smaller, so a link does not stand taller than its line.
	linkClassName?: string;
};

export function AnnotatedText({
	text,
	annotations,
	entryMap,
	keywordById,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
	linkClassName,
}: AnnotatedTextProps) {
	const sorted = [...annotations]
		.filter((item) => item.end > item.start && item.start >= 0)
		.sort((left, right) => left.start - right.start);

	const nodes: ReactNode[] = [];
	let cursor = 0;

	for (const annotation of sorted) {
		const keyword = keywordById.get(annotation.keywordId);
		// A keyword the bundle did not ship, which happens while the bundle is
		// still loading, leaves the words as plain text rather than a hole.
		if (!keyword) continue;

		// The entry the keyword opens is also the one its colour comes from, so
		// an Arc perk reads Arc here exactly as it does inside a tooltip.
		const target = keyword.references
			.map((id) => entryMap.get(id))
			.find((entry) => entry !== undefined);
		if (!target) continue;

		if (annotation.start > cursor) {
			nodes.push(text.slice(cursor, annotation.start));
		}

		nodes.push(
			<TooltipButton
				key={`${annotation.keywordId}-${String(annotation.start)}`}
				keyword={keyword}
				entry={target}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
				className={cn("inline-flex align-bottom", linkClassName)}
				size="default"
			>
				{text.slice(annotation.start, annotation.end)}
			</TooltipButton>,
		);

		cursor = annotation.end;
	}

	if (cursor < text.length) nodes.push(text.slice(cursor));

	return <>{nodes}</>;
}
