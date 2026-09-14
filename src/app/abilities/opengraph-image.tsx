import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import {
	OG_ACCENTS,
	OG_CONTENT_TYPE,
	OG_SIZE,
	renderOgImage,
} from "@/lib/site/og";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt =
	"Owl Sector Abilities & Subclasses - every super, aspect and fragment";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
	const resolver = await loadBungieManifestSnapshotResolver().catch(() => null);
	const subclasses = resolver?.getSubclasses() ?? [];

	return renderOgImage({
		eyebrow: "Destiny 2 Knowledge Base",
		title: "Abilities & Subclasses",
		description:
			"Every super, ability, aspect and fragment for all three classes and all six subclasses, grouped the way the game groups them.",
		path: "/abilities",
		accent: OG_ACCENTS.arc,
		stats: subclasses.length
			? [
					{ label: "Subclasses", value: String(subclasses.length) },
					{ label: "Classes", value: "3" },
				]
			: [],
	});
}
