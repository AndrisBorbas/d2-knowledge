import type { Metadata } from "next";

export const SITE_URL = "https://owlsector.net";
export const SITE_NAME = "Owl Sector";
export const SITE_DESCRIPTION =
	"Destiny 2 community knowledge base - hidden numbers, undocumented mechanics, and unexplained interactions dug out of the game by dedicated players - shown in a clear and accessible format.";

// Upstream data sources, credited in the footer and in every entry tooltip.
export const DATA_COMPENDIUM_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4/edit?utm_source=owlsector";
export const DATA_COMPENDIUM_PATREON_URL =
	"https://www.patreon.com/DataCompendium?utm_source=owlsector";
export const CLARITY_URL = "https://d2clarity.com?utm_source=owlsector";
export const CLARITY_DISCORD_URL =
	"https://d2clarity.com/discord?utm_source=owlsector";
export const CLARITY_KOFI_URL =
	"https://url.d2clarity.com/ko-fi?utm_source=owlsector";

type PageMetadataInput = {
	title: string;
	description: string;
	/** Route path, leading slash included: "/glossary". */
	path: string;
};

/**
 * Metadata is merged shallowly between segments, so a page that sets only
 * `title` and `description` keeps the root layout's whole `openGraph` block -
 * which is why every link to a subpage used to preview as the home page.
 * Images are deliberately left out: the segment's own `opengraph-image` file
 * fills both the Open Graph and the Twitter card.
 */
export function buildPageMetadata({
	title,
	description,
	path,
}: PageMetadataInput): Metadata {
	const socialTitle = `${title} | ${SITE_NAME}`;

	return {
		title,
		description,
		alternates: { canonical: path },
		openGraph: {
			type: "website",
			url: path,
			siteName: SITE_NAME,
			title: socialTitle,
			description,
			locale: "en_US",
		},
		twitter: {
			card: "summary_large_image",
			title: socialTitle,
			description,
		},
	};
}
