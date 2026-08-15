export type SiteSectionStatus = "live" | "planned";

export type SiteSection = {
	slug: string;
	href: string;
	title: string;
	description: string;
	status: SiteSectionStatus;
};

// Single source of truth for the landing page cards and the header nav.
// Adding a page = one entry here plus the route.
export const SITE_SECTIONS: SiteSection[] = [
	{
		slug: "artifacts",
		href: "/artifacts",
		title: "Artifacts",
		description: "Every artifact perk laid out the way the game shows it.",
		status: "live",
	},
	{
		slug: "abilities",
		href: "#",
		title: "Abilities & Subclasses",
		description:
			"Supers, aspects, fragments and grenades per subclass - still being designed.",
		status: "planned",
	},
	{
		slug: "glossary",
		href: "/glossary",
		title: "Glossary",
		description:
			"Every perk, verb, mod and set bonus in one searchable list, with the community numbers spliced into the in-game text.",
		status: "live",
	},
];

export const LIVE_SITE_SECTIONS = SITE_SECTIONS.filter(
	(section) => section.status === "live",
);
