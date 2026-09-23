import {
	CLARITY_URL,
	DATA_COMPENDIUM_SHEET_URL,
	SITE_DESCRIPTION,
	SITE_NAME,
	SITE_URL,
} from "./meta";

// Schema.org JSON-LD for search engines and AI crawlers. Nothing here is
// visible on the page; it restates what the page already says, so it must
// never claim more than the page shows.

type JsonLdNode = Record<string, unknown>;

const OWNER_URL = "https://github.com/AndrisBorbas";

// The source links carry a `utm_source` so the sources can see the referrals.
// Structured data names the resource itself, so the tag comes off.
function withoutTracking(url: string) {
	const parsed = new URL(url);
	parsed.searchParams.delete("utm_source");
	return parsed.toString();
}

function absoluteUrl(path: string) {
	return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

const DESTINY_2: JsonLdNode = {
	"@type": "VideoGame",
	name: "Destiny 2",
	publisher: { "@type": "Organization", name: "Bungie" },
};

const DATA_COMPENDIUM: JsonLdNode = {
	"@type": "Organization",
	name: "Destiny Data Compendium",
	url: withoutTracking(DATA_COMPENDIUM_SHEET_URL),
};

const CLARITY: JsonLdNode = {
	"@type": "Organization",
	name: "Clarity",
	url: withoutTracking(CLARITY_URL),
};

const WEBSITE_ID = `${SITE_URL}/#website`;
const OWNER_ID = `${SITE_URL}/#owner`;

export function buildWebsiteJsonLd(): JsonLdNode {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": WEBSITE_ID,
				url: SITE_URL,
				name: SITE_NAME,
				description: SITE_DESCRIPTION,
				inLanguage: "en",
				about: DESTINY_2,
				publisher: { "@id": OWNER_ID },
			},
			{
				"@type": "Person",
				"@id": OWNER_ID,
				name: "AndrisBorbas",
				url: OWNER_URL,
				sameAs: [OWNER_URL],
			},
		],
	};
}

type Crumb = { name: string; path: string };

export function buildBreadcrumbJsonLd(crumbs: Crumb[]): JsonLdNode {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((crumb, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: crumb.name,
			item: absoluteUrl(crumb.path),
		})),
	};
}

type Source = { name: string; url: string };

type DatasetInput = {
	name: string;
	description: string;
	path: string;
	dateModified?: string;
	creator: Source;
	sources: Source[];
	keywords: string[];
};

export function buildDatasetJsonLd({
	name,
	description,
	path,
	dateModified,
	creator,
	sources,
	keywords,
}: DatasetInput): JsonLdNode {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name,
		description,
		url: absoluteUrl(path),
		dateModified,
		inLanguage: "en",
		keywords,
		about: DESTINY_2,
		isAccessibleForFree: true,
		creator: {
			"@type": "Person",
			name: creator.name,
			url: withoutTracking(creator.url),
		},
		isBasedOn: sources.map((source) => ({
			"@type": "CreativeWork",
			name: source.name,
			url: withoutTracking(source.url),
		})),
		includedInDataCatalog: { "@type": "DataCatalog", "@id": WEBSITE_ID },
	};
}

export function buildGlossaryJsonLd(dateModified: string): JsonLdNode {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "Destiny 2 perk and mechanic glossary",
		description:
			"Every Destiny 2 perk, verb, mod and set bonus, with the hidden numbers measured by the Destiny Data Compendium and Clarity spliced into the in-game text.",
		url: absoluteUrl("/glossary"),
		dateModified,
		inLanguage: "en",
		keywords: ["Destiny 2", "perks", "hidden numbers", "mods", "set bonuses"],
		about: DESTINY_2,
		isAccessibleForFree: true,
		creator: [DATA_COMPENDIUM, CLARITY],
		publisher: { "@id": OWNER_ID },
	};
}

export function buildMechanicsJsonLd(): JsonLdNode {
	return {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: "Destiny 2 Game Mechanics",
		description:
			"How Destiny 2 works under the hood: ability energy, activity modifiers, character stats, Champions, combatant tiers, Banes, heat weapons and Super energy.",
		url: absoluteUrl("/mechanics"),
		inLanguage: "en",
		about: DESTINY_2,
		author: DATA_COMPENDIUM,
		publisher: { "@id": OWNER_ID },
		isPartOf: { "@id": WEBSITE_ID },
	};
}
