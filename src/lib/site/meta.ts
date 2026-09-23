import type { Metadata } from "next";

const PRODUCTION_URL = "https://owlsector.net";

/**
 * Every share card and canonical link is absolute, resolved against this. On a
 * Cloudflare preview deployment that would point a crawler at production, which
 * has no copy of the branch's pages or cards yet - so a preview build points at
 * itself instead. `NEXT_PUBLIC_SITE_URL` overrides both.
 */
function resolveSiteUrl() {
	const explicit = process.env.NEXT_PUBLIC_SITE_URL;
	if (explicit) return explicit.replace(/\/+$/u, "");

	const branch = process.env.CF_PAGES_BRANCH;
	const deploymentUrl = process.env.CF_PAGES_URL;
	if (deploymentUrl && branch && branch !== "main") return deploymentUrl;

	return PRODUCTION_URL;
}

export const SITE_URL = resolveSiteUrl();

// The host the share cards print, which stays the real one even on a preview
// deployment that points its own links at itself.
export const SITE_HOST = PRODUCTION_URL.replace(/^https?:\/\//u, "");
export const SITE_NAME = "Owl Sector";
export const SITE_DESCRIPTION =
	"Destiny 2 community knowledge base - hidden numbers, undocumented mechanics, and unexplained interactions dug out of the game by dedicated players - shown in a clear and accessible format.";

// Upstream data sources, credited in the footer and in every entry tooltip.
export const DATA_COMPENDIUM_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4/edit?utm_source=owlsector";
export const DATA_COMPENDIUM_PATREON_URL =
	"https://www.patreon.com/DataCompendium?utm_source=owlsector";
export const CLARITY_URL = "https://d2clarity.com?utm_source=owlsector";
export const CLARITY_DISCORD_URL = "https://d2clarity.com/discord";
export const CLARITY_KOFI_URL =
	"https://url.d2clarity.com/ko-fi?utm_source=owlsector";

/**
 * Where `bun run assets:prepare` writes a page's share card, and what the page
 * points `og:image` at. One flat file per route, named after the route, so the
 * URL carries a `.png` a static host can type the response with - Next's
 * `opengraph-image` convention serves the same bytes from an extensionless URL,
 * which Cloudflare hands over as `application/octet-stream` and Discord drops.
 */
export function ogImagePath(path: string) {
	const slug = path.replace(/^\/+|\/+$/gu, "").replace(/\//gu, "-");
	return `/assets/og/${slug || "home"}.png`;
}

type PageMetadataInput = {
	title: string;
	description: string;
	/** Route path, leading slash included: "/glossary". */
	path: string;
	/** Alt text for the page's share card. */
	imageAlt?: string;
};

/**
 * Metadata is merged shallowly between segments, so a page that sets only
 * `title` and `description` keeps the root layout's whole `openGraph` block -
 * which is why every link to a subpage used to preview as the home page.
 */
export function buildPageMetadata({
	title,
	description,
	path,
	imageAlt,
}: PageMetadataInput): Metadata {
	const socialTitle = `${title} | ${SITE_NAME}`;
	const images = [
		{
			url: ogImagePath(path),
			width: 1200,
			height: 630,
			type: "image/png",
			alt: imageAlt ?? socialTitle,
		},
	];

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
			images,
		},
		twitter: {
			card: "summary_large_image",
			title: socialTitle,
			description,
			images,
		},
	};
}
