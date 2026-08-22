// Source description text arrives with trailing spaces before newlines, runs
// of blank lines and double spaces - from Clarity's block/line structure and
// from Bungie's own manifest strings alike. Normalize both the same way so the
// two descriptions on a card render with matching rhythm.
export function cleanupDescriptionText(value: string) {
	return value
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
}

// Two descriptions "say the same thing" when only punctuation, casing and
// whitespace differ - used to keep a card from printing the same paragraph
// twice when Clarity, the DDC and the manifest happen to agree.
export function isSameDescription(a: string, b: string) {
	const normalize = (value: string) =>
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.trim();
	return normalize(a) === normalize(b);
}
