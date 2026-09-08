import type { Metadata } from "next";

import { SubclassExplorer } from "@/components/abilities/SubclassExplorer";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { buildTooltipBundle } from "@/lib/compendium/bundle";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import {
	buildSubclasses,
	findSubclass,
	getSubclassEntries,
	type Subclass,
} from "@/lib/compendium/subclasses";

// Prerendered at build time. This is load-bearing for portability, not just
// cost: `loadCompendiumDataset` reads the dataset off disk, and runtimes like
// Cloudflare Workers have no filesystem at request time.
export const dynamic = "force-static";

type SubclassPageProps = {
	params: Promise<{ classSlug: string; elementSlug: string }>;
};

async function loadSubclasses(): Promise<Subclass[]> {
	const resolver = await loadBungieManifestSnapshotResolver();
	const subclasses = resolver?.getSubclasses() ?? [];
	if (subclasses.length === 0) return [];

	const dataset = await loadCompendiumDataset();
	return buildSubclasses(dataset.entries, subclasses);
}

export async function generateStaticParams() {
	const subclasses = await loadSubclasses();
	return subclasses.map((subclass) => ({
		classSlug: subclass.classSlug,
		elementSlug: subclass.elementSlug,
	}));
}

export async function generateMetadata({
	params,
}: SubclassPageProps): Promise<Metadata> {
	const { classSlug, elementSlug } = await params;
	const subclasses = await loadSubclasses();
	const subclass = findSubclass(subclasses, classSlug, elementSlug);

	if (!subclass) {
		return { title: "Abilities" };
	}

	return {
		title: `${subclass.element} ${subclass.className}`,
		description: `Every super, ability, aspect and fragment a ${subclass.element} ${subclass.className} can equip, with the community's hidden numbers.`,
		alternates: { canonical: `/abilities/${classSlug}/${elementSlug}` },
	};
}

export default async function SubclassPage({ params }: SubclassPageProps) {
	const { classSlug, elementSlug } = await params;

	let dataset: Awaited<ReturnType<typeof loadCompendiumDataset>> | null = null;
	let errorMessage: string | null = null;

	try {
		dataset = await loadCompendiumDataset();
	} catch (error) {
		errorMessage =
			error instanceof Error ? error.message : "Unknown parser error";
	}

	const subclasses = dataset ? await loadSubclasses() : [];
	const selected = findSubclass(subclasses, classSlug, elementSlug);

	if (!dataset || !selected) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-12">
				<div className="borderHover w-full bg-black/45 p-8 backdrop-blur-md">
					<h1 className="text-3xl font-semibold text-white">
						{dataset ? "Subclass not found" : "Failed to load the dataset"}
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">
						{errorMessage ??
							"The Bungie manifest snapshot has no subclasses. Run bun run data:bungie:snapshot to rebuild it."}
					</p>
				</div>
			</main>
		);
	}

	// Only this subclass's entries (plus whatever their keywords reference) get
	// serialized into the RSC payload - the full dataset is ~5 MB.
	const bundle = buildTooltipBundle(
		dataset,
		getSubclassEntries(selected, dataset.entries),
	);

	return (
		<main className="flex-1">
			<SubclassExplorer
				subclasses={subclasses}
				selected={selected}
				bundle={bundle}
			/>
		</main>
	);
}
