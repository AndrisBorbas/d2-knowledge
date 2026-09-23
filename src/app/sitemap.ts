import type { MetadataRoute } from "next";

import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import { SITE_URL } from "@/lib/site/meta";

// A static export only emits route handlers that opt into static rendering.
export const dynamic = "force-static";

// Routes whose content is the compiled dataset. They share its compile time as
// `lastModified`, which moves only when the data does - a build timestamp would
// change on every deploy and teach crawlers to ignore the field.
const DATA_ROUTES = [
	"/",
	"/weapons",
	"/abilities",
	"/artifacts",
	"/glossary",
	"/mechanics",
];

async function readGeneratedAt() {
	try {
		const dataset = await loadCompendiumDataset();
		return new Date(dataset.generatedAt);
	} catch {
		return undefined;
	}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const lastModified = await readGeneratedAt();

	// Same source as the subclass pages' `generateStaticParams`, so the sitemap
	// cannot list a page the build did not emit.
	const resolver = await loadBungieManifestSnapshotResolver();
	const subclassPaths = (resolver?.getSubclasses() ?? []).map(
		(subclass) => `/abilities/${subclass.classSlug}/${subclass.elementSlug}`,
	);

	return [
		...[...DATA_ROUTES, ...subclassPaths].map((path) => ({
			url: `${SITE_URL}${path === "/" ? "" : path}`,
			lastModified,
		})),
		{ url: `${SITE_URL}/changelog` },
		{ url: `${SITE_URL}/about` },
	];
}
