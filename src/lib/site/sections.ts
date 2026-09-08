export type SiteSectionStatus =
	"live" | "planned" | "navOnly" | "sectionsOnly" | "hidden";

export type SiteSection = {
	slug: string;
	href: string;
	title: string;
	description?: string;
	status: SiteSectionStatus;
};

// Single source of truth for the landing page cards and the header nav.
// Adding a page = one entry here plus the route.
export const SITE_PAGES: SiteSection[] = [
	{
		slug: "artifacts",
		href: "/artifacts",
		title: "Artifacts",
		description: "Every artifact perk laid out the way the game shows it.",
		status: "live",
	},
	{
		slug: "abilities",
		href: "/abilities",
		title: "Abilities & Subclasses",
		description:
			"Every super, ability, aspect and fragment a class can equip, laid out similarly to the in-game screen.",
		status: "live",
	},
	{
		slug: "glossary",
		href: "/glossary",
		title: "Glossary",
		description:
			"Every perk, verb, mod and set bonus in one searchable list, with the community numbers spliced into the in-game text.",
		status: "live",
	},
	{
		slug: "changelog",
		href: "/changelog",
		title: "Changelog",
		status: "navOnly",
	},
];

export const NAV_SITE_PAGES = SITE_PAGES.filter(
	(section) => section.status === "live" || section.status === "navOnly",
);

export const SECTIONS_SITE_PAGES = SITE_PAGES.filter(
	(section) =>
		section.status === "live" ||
		section.status === "sectionsOnly" ||
		section.status === "planned",
);
