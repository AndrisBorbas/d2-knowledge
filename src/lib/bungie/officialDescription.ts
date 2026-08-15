import type { IconGlyph } from "@/lib/compendium/model";
import { buildIconMarker } from "@/lib/utils/iconGlyph";
import { cleanupDescriptionText } from "@/lib/utils/text";

import { GLYPH_CLASS_NAME_BY_BUNGIE_TOKEN } from "./glyphs";

// Bungie's spacing after a token is inconsistent — "[Arc]Arc", "[Stasis] Stasis"
// and "[Heavy Attack]  :" all occur — so the trailing whitespace is swallowed
// and re-emitted as exactly one space.
const BRACKET_TOKEN_PATTERN = /\[([^\][]+)\][ \t]*/g;

function normalizeToken(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
	if (value.length === 0) return value;
	return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

export type BuiltOfficialDescription = {
	text: string;
	iconGlyphs: IconGlyph[];
};

/**
 * Turns a raw Destiny 2 manifest description into the app's description format:
 * bracketed glyph tokens become inline icon markers, everything else stays text.
 *
 * `existingGlyphs` must be the entry's current `iconGlyphs` — markers are
 * resolved against one flat per-entry array at render time, so new glyphs are
 * numbered starting at that array's length and returned appended to it.
 */
export function buildOfficialDescription(params: {
	rawDescription: string;
	existingGlyphs: IconGlyph[];
	resolveGlyphIcon: (className: string) => string | undefined;
}): BuiltOfficialDescription | null {
	const { rawDescription, existingGlyphs, resolveGlyphIcon } = params;
	if (!rawDescription.trim()) return null;

	const iconGlyphs = [...existingGlyphs];
	const text = rawDescription.replace(
		BRACKET_TOKEN_PATTERN,
		(match, tokenText: string) => {
			const token = normalizeToken(tokenText);
			const className = GLYPH_CLASS_NAME_BY_BUNGIE_TOKEN[token];
			if (!className) return `${tokenText.trim()} `;

			const iconPath = resolveGlyphIcon(className);
			if (!iconPath) return `${tokenText.trim()} `;

			iconGlyphs.push({ label: toTitleCase(className), iconPath });
			return `${buildIconMarker(iconGlyphs.length - 1)} `;
		},
	);

	const cleaned = cleanupDescriptionText(text);
	if (!cleaned || cleaned.startsWith("Upgrades this weapon to a Masterwork."))
		return null;

	return { text: cleaned, iconGlyphs };
}
