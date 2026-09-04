// Keep a Changelog (https://keepachangelog.com) in a deliberately small dialect,
// so CHANGELOG.md stays a plain file that renders on GitHub and needs no
// markdown dependency to render here:
//
//   ## [Unreleased]
//   ## [1.3.4] - 2026-09-04
//   ### Added|Changed|Fixed|Removed|Deprecated|Security
//   - one bullet per change
//
// Anything above the first `##` is treated as the file's preamble and dropped.

export const CHANGE_KINDS = [
	"Added",
	"Changed",
	"Fixed",
	"Removed",
	"Deprecated",
	"Security",
] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

export type ChangelogSection = {
	// The `###` heading, normalised to one of `CHANGE_KINDS` when it matches one.
	// `null` for bullets written before any section heading.
	kind: ChangeKind | string | null;
	items: string[];
};

export type ChangelogRelease = {
	// `"Unreleased"` for the pending section, otherwise the raw version string.
	version: string;
	// Anchor target, e.g. `1.3.4` -> `1-3-4`.
	slug: string;
	// As written in the file (`YYYY-MM-DD` by convention), or `null` when the
	// release has no date yet.
	date: string | null;
	isUnreleased: boolean;
	sections: ChangelogSection[];
};

const RELEASE_HEADING = /^##(?!#)\s*(.+?)\s*$/;
const SECTION_HEADING = /^###(?!#)\s*(.+?)\s*$/;
const BULLET = /^[-*]\s+(.+?)\s*$/;
// `[1.3.4] - 2026-09-04`, `1.3.4 - 2026-09-04`, `[Unreleased]`.
const RELEASE_TITLE = /^\[?([^\]\s]+)\]?(?:\s*-\s*(.+?))?$/;

export function slugifyVersion(version: string) {
	return (
		version
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "release"
	);
}

function normaliseKind(heading: string): ChangelogSection["kind"] {
	const match = CHANGE_KINDS.find(
		(kind) => kind.toLowerCase() === heading.toLowerCase(),
	);
	return match ?? heading;
}

export function parseChangelog(source: string): ChangelogRelease[] {
	const releases: ChangelogRelease[] = [];
	let release: ChangelogRelease | null = null;
	let section: ChangelogSection | null = null;

	for (const rawLine of source.split(/\r?\n/)) {
		const line = rawLine.trimEnd();

		const releaseHeading = RELEASE_HEADING.exec(line);
		if (releaseHeading) {
			const title = RELEASE_TITLE.exec(releaseHeading[1]);
			const version = title?.[1] ?? releaseHeading[1];

			release = {
				version,
				slug: slugifyVersion(version),
				date: title?.[2]?.trim() ?? null,
				isUnreleased: version.toLowerCase() === "unreleased",
				sections: [],
			};
			section = null;
			releases.push(release);
			continue;
		}

		if (!release) continue;

		const sectionHeading = SECTION_HEADING.exec(line);
		if (sectionHeading) {
			section = { kind: normaliseKind(sectionHeading[1]), items: [] };
			release.sections.push(section);
			continue;
		}

		const bullet = BULLET.exec(line);
		if (bullet) {
			// Bullets written before any `###` land in an unlabelled section.
			if (!section) {
				section = { kind: null, items: [] };
				release.sections.push(section);
			}
			section.items.push(bullet[1]);
			continue;
		}

		// A wrapped bullet: prettier reflows long entries onto the next line.
		const continuation = line.trim();
		if (continuation && section && section.items.length > 0) {
			section.items[section.items.length - 1] += ` ${continuation}`;
		}
	}

	return releases.filter((entry) =>
		entry.sections.some((entrySection) => entrySection.items.length > 0),
	);
}
