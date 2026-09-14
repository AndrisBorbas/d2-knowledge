import manifest from "@/../package.json";
import { loadChangelog } from "@/lib/changelog/load";
import {
	OG_ACCENTS,
	OG_CONTENT_TYPE,
	OG_SIZE,
	renderOgImage,
} from "@/lib/site/og";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt = "Owl Sector Changelog - what changed in each release";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
	const releases = await loadChangelog().catch(() => []);

	return renderOgImage({
		eyebrow: "Destiny 2 Knowledge Base",
		title: "Changelog",
		description:
			"What changed in each release of Owl Sector, newest first: new pages, new data, fixes and removals.",
		path: "/changelog",
		accent: OG_ACCENTS.strand,
		stats: [
			{ label: "Version", value: `v${manifest.version}` },
			{ label: "Releases", value: String(releases.length) },
		],
	});
}
