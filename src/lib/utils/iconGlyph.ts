// Private Use Area sentinels: guaranteed to never appear in source game text,
// and never mistaken for a keyword term by the annotation matcher in
// src/lib/sheet/keywords.ts (which treats any non-alphanumeric character as a
// valid word boundary).
const ICON_MARKER_OPEN = "";
const ICON_MARKER_CLOSE = "";
const ICON_MARKER_PATTERN = new RegExp(
	`${ICON_MARKER_OPEN}(\\d+)${ICON_MARKER_CLOSE}`,
	"g",
);

export function buildIconMarker(glyphIndex: number) {
	return `${ICON_MARKER_OPEN}${glyphIndex}${ICON_MARKER_CLOSE}`;
}

export type DescriptionTextPart =
	| { type: "text"; text: string }
	| { type: "icon"; glyphIndex: number };

export function splitDescriptionIconMarkers(
	text: string,
): DescriptionTextPart[] {
	const parts: DescriptionTextPart[] = [];
	let cursor = 0;

	for (const match of text.matchAll(ICON_MARKER_PATTERN)) {
		const index = match.index ?? 0;
		if (index > cursor) {
			parts.push({ type: "text", text: text.slice(cursor, index) });
		}
		parts.push({ type: "icon", glyphIndex: Number(match[1]) });
		cursor = index + match[0].length;
	}

	if (cursor < text.length) {
		parts.push({ type: "text", text: text.slice(cursor) });
	}

	return parts;
}
