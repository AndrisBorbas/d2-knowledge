import { loadCompendiumDataset } from "@/lib/compendium/load";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/site/og";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt = "Owl Sector Glossary - every Destiny 2 perk, verb and mod";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
	// A broken dataset already fails the page itself loudly; the card just drops
	// its stat row rather than taking the build down with it.
	const dataset = await loadCompendiumDataset().catch(() => null);

	return renderOgImage({
		eyebrow: "Destiny 2 Knowledge Base",
		title: "Glossary",
		description:
			"Search every Destiny 2 perk, verb, mod and set bonus, with the community's hidden numbers spliced into the in-game text.",
		path: "/glossary",
		stats: dataset
			? [
					{ label: "Entries", value: String(dataset.entries.length) },
					{ label: "Keywords", value: String(dataset.keywords.length) },
				]
			: [],
	});
}
