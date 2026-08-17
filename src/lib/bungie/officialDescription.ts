import type { IconGlyph } from "@/lib/compendium/model";
import { buildIconMarker } from "@/lib/utils/iconGlyph";
import { cleanupDescriptionText } from "@/lib/utils/text";

import {
	GLYPH_CLASS_NAME_BY_BUNGIE_TOKEN,
	NAMED_SUBSTITUTION_BY_TOKEN,
} from "./glyphs";

// Bungie's spacing after a token is inconsistent — "[Arc]Arc", "[Stasis] Stasis"
// and "[Heavy Attack]  :" all occur — so the trailing whitespace is swallowed
// and re-emitted as exactly one space.
const BRACKET_TOKEN_PATTERN = /\[([^\][]+)\][ \t]*/g;

// Matches the "###DestinyNamedSubstitutions.<key>###" tokens Bungie embeds
// for dynamic input prompts (see glyphs.ts for why these need a lookup table
// instead of resolving straight from the manifest).
const NAMED_SUBSTITUTION_TOKEN_PATTERN =
	/^###DestinyNamedSubstitutions\.([a-zA-Z0-9_]+)###$/;

function humanizeNamedSubstitutionKey(key: string) {
	return `[${key.replace(/^ui_player_action_/, "").replace(/_/g, " ")}]`;
}

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

// Exotic catalyst items carry this boilerplate as their own displayProperties
// description — the actual catalyst effect lives on a perk referenced by the
// item's `perks` array instead. Shared with scripts/fetch-bungie-manifest.mts,
// which swaps the boilerplate for that perk's description before this filter runs.
export const CATALYST_MASTERWORK_BOILERPLATE_PREFIXES = [
	"Upgrades this weapon to a Masterwork",
	"When upgraded to a Masterwork",
];

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
			const trimmedToken = tokenText.trim();
			const substitutionMatch = trimmedToken.match(
				NAMED_SUBSTITUTION_TOKEN_PATTERN,
			);
			if (substitutionMatch) {
				const key = substitutionMatch[1];
				const replacement = NAMED_SUBSTITUTION_BY_TOKEN[key];
				if (!replacement) return `${humanizeNamedSubstitutionKey(key)} `;

				if ("iconPath" in replacement) {
					iconGlyphs.push({
						label: replacement.label,
						iconPath: replacement.iconPath,
					});
					return `${buildIconMarker(iconGlyphs.length - 1)} `;
				}

				return `${replacement.text} `;
			}

			const token = normalizeToken(tokenText);
			const className = GLYPH_CLASS_NAME_BY_BUNGIE_TOKEN[token];
			if (!className) return `${trimmedToken} `;

			const iconPath = resolveGlyphIcon(className);
			if (!iconPath) return `${trimmedToken} `;

			iconGlyphs.push({ label: toTitleCase(className), iconPath });
			return `${buildIconMarker(iconGlyphs.length - 1)} `;
		},
	);

	const cleaned = cleanupDescriptionText(text);
	if (
		!cleaned ||
		CATALYST_MASTERWORK_BOILERPLATE_PREFIXES.some((prefix) =>
			cleaned.startsWith(prefix),
		)
	)
		return null;

	return { text: cleaned, iconGlyphs };
}
