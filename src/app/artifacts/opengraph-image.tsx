import {
	buildArtifacts,
	getArtifactPerkEntries,
} from "@/lib/compendium/artifacts";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import {
	OG_ACCENTS,
	OG_CONTENT_TYPE,
	OG_SIZE,
	renderOgImage,
} from "@/lib/site/og";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt = "Owl Sector Artifacts - every Destiny 2 artifact perk";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
	const dataset = await loadCompendiumDataset().catch(() => null);
	const artifacts = dataset ? buildArtifacts(dataset.entries) : [];
	const perkCount = dataset
		? getArtifactPerkEntries(dataset.entries).length
		: 0;

	return renderOgImage({
		eyebrow: "Destiny 2 Knowledge Base",
		title: "Artifacts",
		description:
			"Every Destiny 2 artifact perk laid out the way the game shows it, with the community's hidden numbers on hover.",
		path: "/artifacts",
		accent: OG_ACCENTS.void,
		stats: artifacts.length
			? [
					{ label: "Artifacts", value: String(artifacts.length) },
					{ label: "Perks", value: String(perkCount) },
				]
			: [],
	});
}
