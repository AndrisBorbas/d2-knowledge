import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import {
	buildSubclasses,
	findSubclass,
	type Subclass,
} from "@/lib/compendium/subclasses";
import {
	fetchImageDataUri,
	OG_ACCENTS,
	OG_CONTENT_TYPE,
	OG_SIZE,
	renderOgImage,
} from "@/lib/site/og";

// Baked into out/ at build time like every other route here.
export const dynamic = "force-static";

export const alt = "Owl Sector - Destiny 2 subclass abilities";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type ImageProps = {
	params: Promise<{ classSlug: string; elementSlug: string }>;
};

async function loadSubclasses(): Promise<Subclass[]> {
	const resolver = await loadBungieManifestSnapshotResolver();
	const subclasses = resolver?.getSubclasses() ?? [];
	if (subclasses.length === 0) return [];

	const dataset = await loadCompendiumDataset();
	return buildSubclasses(dataset.entries, subclasses);
}

// A metadata route in a dynamic segment does not inherit the page's params, so
// the static export needs its own list of them.
export async function generateStaticParams() {
	const subclasses = await loadSubclasses();
	return subclasses.map((subclass) => ({
		classSlug: subclass.classSlug,
		elementSlug: subclass.elementSlug,
	}));
}

export default async function Image({ params }: ImageProps) {
	const { classSlug, elementSlug } = await params;
	const subclasses = await loadSubclasses().catch(() => []);
	const subclass = findSubclass(subclasses, classSlug, elementSlug);

	const accent =
		OG_ACCENTS[elementSlug as keyof typeof OG_ACCENTS] ?? OG_ACCENTS.default;

	if (!subclass) {
		return renderOgImage({
			eyebrow: "Abilities & Subclasses",
			title: "Subclass",
			description:
				"Every super, ability, aspect and fragment a subclass can equip, with the community's hidden numbers.",
			path: `/abilities/${classSlug}/${elementSlug}`,
			accent,
		});
	}

	const countSlot = (slotId: string) =>
		subclass.slots.find((slot) => slot.id === slotId)?.options.length ?? 0;

	// The snapshot stores an absolute bungie.net URL, and satori cannot fetch
	// one itself, so it is downloaded and inlined here.
	const icon = subclass.iconPath
		? await fetchImageDataUri(subclass.iconPath)
		: null;

	const stats = [
		{ label: "Aspects", value: String(countSlot("aspects")) },
		{ label: "Fragments", value: String(countSlot("fragments")) },
		{ label: "Supers", value: String(countSlot("supers")) },
	].filter((stat) => stat.value !== "0");

	return renderOgImage({
		eyebrow: "Abilities & Subclasses",
		title: `${subclass.element} ${subclass.className}`,
		description: `Every super, ability, aspect and fragment a ${subclass.element} ${subclass.className} can equip, with the community's hidden numbers.`,
		path: `/abilities/${classSlug}/${elementSlug}`,
		accent,
		stats,
		icon,
	});
}
