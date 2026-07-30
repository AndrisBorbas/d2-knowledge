"use client";

import Image from "next/image";
import { type ReactNode } from "react";

import type {
	AnnotatedEntry,
	Annotation,
	IconGlyph,
	Keyword,
} from "@/lib/compendium/model";
import { splitDescriptionIconMarkers } from "@/lib/utils/iconGlyph";

import { TooltipButton } from "./TooltipButton";
import type { KeywordClickPayload, KeywordHoverPayload } from "./types";

type TextWithTooltipsProps = {
	text?: string;
	annotations: Annotation[];
	entry: AnnotatedEntry;
	entryMap: Map<string, AnnotatedEntry>;
	keywordById: Map<string, Keyword>;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
};

function resolveColorEntry(
	keyword: Keyword,
	entry: AnnotatedEntry,
	entryMap: Map<string, AnnotatedEntry>,
): AnnotatedEntry {
	const referencedEntryId = keyword.references.find((id) => entryMap.has(id));
	if (!referencedEntryId) {
		return entry;
	}

	return entryMap.get(referencedEntryId) ?? entry;
}

function InlineGlyphIcon({ glyph }: { glyph: IconGlyph }) {
	return (
		<Image
			src={glyph.iconPath}
			alt={glyph.label}
			title={glyph.label}
			width={16}
			height={16}
			className="-mt-0.5 -mr-0.5 inline-block align-middle"
		/>
	);
}

function renderDescriptionSegment(
	text: string,
	iconGlyphs: IconGlyph[] | undefined,
	keyPrefix: string,
): ReactNode[] {
	if (!iconGlyphs || iconGlyphs.length === 0) {
		return [text];
	}

	return splitDescriptionIconMarkers(text).map((part, index) => {
		if (part.type === "text") {
			return part.text;
		}

		const glyph = iconGlyphs[part.glyphIndex];
		return glyph ? (
			<InlineGlyphIcon key={`${keyPrefix}-icon-${index}`} glyph={glyph} />
		) : null;
	});
}

export function TextWithTooltips(props: TextWithTooltipsProps) {
	const text = props.text ?? "";
	const iconGlyphs = props.entry.iconGlyphs;
	const sorted = [...props.annotations]
		.filter((item) => item.end > item.start && item.start >= 0)
		.sort((a, b) => a.start - b.start);

	const nodes: ReactNode[] = [];
	let cursor = 0;

	for (const annotation of sorted) {
		if (annotation.start > cursor) {
			nodes.push(
				...renderDescriptionSegment(
					text.slice(cursor, annotation.start),
					iconGlyphs,
					`pre-${annotation.start}`,
				),
			);
		}

		if (annotation.colorClass) {
			nodes.push(
				<span
					key={`pattern-${annotation.start}-${annotation.end}`}
					className={annotation.colorClass}
				>
					{annotation.text}
				</span>,
			);
			cursor = annotation.end;
			continue;
		}

		if (annotation.color) {
			nodes.push(
				<span
					key={`sheet-color-${annotation.start}-${annotation.end}`}
					style={{ color: annotation.color }}
				>
					{annotation.text}
				</span>,
			);
			cursor = annotation.end;
			continue;
		}

		const keyword = props.keywordById.get(annotation.keywordId);
		if (!keyword) {
			nodes.push(
				...renderDescriptionSegment(
					text.slice(annotation.start, annotation.end),
					iconGlyphs,
					`missing-${annotation.start}`,
				),
			);
			cursor = annotation.end;
			continue;
		}

		nodes.push(
			<TooltipButton
				key={`${annotation.keywordId}-${annotation.start}-${annotation.end}`}
				keyword={keyword}
				entry={resolveColorEntry(keyword, props.entry, props.entryMap)}
				onKeywordClick={props.onKeywordClick}
				onKeywordHover={props.onKeywordHover}
				onKeywordLeave={props.onKeywordLeave}
				className="inline-flex align-bottom"
				size="default"
			>
				{annotation.text}
			</TooltipButton>,
		);

		cursor = annotation.end;
	}

	if (cursor < text.length) {
		nodes.push(
			...renderDescriptionSegment(text.slice(cursor), iconGlyphs, "suffix"),
		);
	}

	return <>{nodes}</>;
}
