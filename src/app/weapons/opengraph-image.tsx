import {
	OG_ACCENTS,
	OG_CONTENT_TYPE,
	OG_SIZE,
	renderOgImage,
} from "@/lib/site/og";
import { loadWeaponsDataset } from "@/lib/weapons/load";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt = "Owl Sector Weapons - Destiny 2 endgame PvE weapon tiers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
	const dataset = await loadWeaponsDataset().catch(() => null);

	return renderOgImage({
		eyebrow: "Destiny 2 Knowledge Base",
		title: "Weapons",
		description:
			"Every Destiny 2 legendary and exotic weapon rated for endgame PvE, with damage numbers and swap DPS.",
		path: "/weapons",
		accent: OG_ACCENTS.solar,
		stats: dataset
			? [
					{ label: "Rated", value: String(dataset.tierRows.length) },
					{ label: "Exotics", value: String(dataset.exotics.length) },
				]
			: [],
	});
}
