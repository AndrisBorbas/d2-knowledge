import { readFile } from "node:fs/promises";
import path from "node:path";

import { type ChangelogRelease, parseChangelog } from "./parse";

// Read at build time only: every route that shows the changelog is
// `force-static`, and the export target has no filesystem at request time.
export async function loadChangelog(): Promise<ChangelogRelease[]> {
	// Literal segments, not a spread: Next traces filesystem access statically.
	const filePath = path.join(process.cwd(), "CHANGELOG.md");

	try {
		return parseChangelog(await readFile(filePath, "utf8"));
	} catch {
		return [];
	}
}
