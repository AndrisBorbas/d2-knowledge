import type { AnnotatedEntry } from "./model";

export const ARTIFACT_TAB_NAME = "Artifact Perks";

// Sheet sections look like "Hunter's Journal (Echoes)": the artifact name plus
// the release it shipped with.
const RELEASE_LABEL_PATTERN = /^(.*?)\s*\(([^()]+)\)\s*$/;

export function stripReleaseLabel(section: string) {
	return RELEASE_LABEL_PATTERN.exec(section)?.[1]?.trim() ?? section.trim();
}

export function toArtifactSlug(name: string) {
	return (
		name
			.toLowerCase()
			.trim()
			// Drop apostrophes rather than turning them into separators, so
			// "Hunter's Journal" slugs to "hunters-journal".
			.replace(/['‘’]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
	);
}

// One slot group per sheet column — the three columns of the Artifact Perks tab
// are the three unlock rows the game shows.
export type ArtifactSlotGroup = {
	column: number;
	entries: AnnotatedEntry[];
};

export type Artifact = {
	slug: string;
	name: string;
	releaseLabel: string | null;
	section: string;
	iconPath?: string;
	artPath?: string;
	groups: ArtifactSlotGroup[];
};

export function buildArtifacts(entries: AnnotatedEntry[]): Artifact[] {
	const bySection = new Map<string, AnnotatedEntry[]>();

	for (const entry of entries) {
		if (entry.tab !== ARTIFACT_TAB_NAME || !entry.section) continue;
		const bucket = bySection.get(entry.section);
		if (bucket) {
			bucket.push(entry);
		} else {
			bySection.set(entry.section, [entry]);
		}
	}

	// Insertion order mirrors the sheet, which lists artifacts newest first.
	return [...bySection.entries()].map(([section, sectionEntries]) => {
		const match = RELEASE_LABEL_PATTERN.exec(section);
		const name = match?.[1]?.trim() ?? section.trim();
		const releaseLabel = match?.[2]?.trim() ?? null;

		const byColumn = new Map<number, AnnotatedEntry[]>();
		for (const entry of sectionEntries) {
			const bucket = byColumn.get(entry.source.column);
			if (bucket) {
				bucket.push(entry);
			} else {
				byColumn.set(entry.source.column, [entry]);
			}
		}

		const groups = [...byColumn.entries()]
			.sort(([left], [right]) => right - left)
			.map(([column, columnEntries]) => ({
				column,
				entries: [...columnEntries].sort(
					(left, right) => left.source.row - right.source.row,
				),
			}));

		return {
			slug: toArtifactSlug(name),
			name,
			releaseLabel,
			section,
			groups,
		} satisfies Artifact;
	});
}

export function getArtifactPerkEntries(entries: AnnotatedEntry[]) {
	return entries.filter(
		(entry) => entry.tab === ARTIFACT_TAB_NAME && entry.section,
	);
}
