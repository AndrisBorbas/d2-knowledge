import type { Metadata } from "next";
import { Suspense } from "react";

import { ArtifactExplorer } from "@/components/artifacts/ArtifactExplorer";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import { loadArtifactArtMap } from "@/lib/compendium/artifact-art";
import {
	buildArtifacts,
	getArtifactPerkEntries,
} from "@/lib/compendium/artifacts";
import { buildTooltipBundle } from "@/lib/compendium/bundle";
import { loadCompendiumDataset } from "@/lib/compendium/load";

export const metadata: Metadata = {
	title: "Artifacts",
	description:
		"Every Destiny 2 artifact perk laid out the way the game shows it, with the community's hidden numbers on hover.",
	alternates: { canonical: "/artifacts" },
};

export default async function ArtifactsPage() {
	let dataset: Awaited<ReturnType<typeof loadCompendiumDataset>> | null = null;
	let errorMessage: string | null = null;

	try {
		dataset = await loadCompendiumDataset();
	} catch (error) {
		errorMessage =
			error instanceof Error ? error.message : "Unknown parser error";
	}

	if (!dataset) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-12">
				<div className="borderHover w-full bg-black/45 p-8 backdrop-blur-md">
					<h1 className="text-3xl font-semibold text-white">
						Failed to load the dataset
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">{errorMessage}</p>
				</div>
			</main>
		);
	}

	const [resolver, artBySlug] = await Promise.all([
		loadBungieManifestSnapshotResolver(),
		loadArtifactArtMap(),
	]);

	const artifacts = buildArtifacts(dataset.entries).map((artifact) => ({
		...artifact,
		iconPath: resolver?.getItemEnrichmentByTitle(artifact.name)?.itemIconPath,
		artPath: artBySlug.get(artifact.slug),
	}));

	// Only the artifact perks (plus whatever their keywords reference) get
	// serialized into the RSC payload — the full dataset is ~5 MB.
	const bundle = buildTooltipBundle(
		dataset,
		getArtifactPerkEntries(dataset.entries),
	);

	if (artifacts.length === 0) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-12">
				<div className="borderHover w-full bg-black/45 p-8 backdrop-blur-md">
					<h1 className="text-3xl font-semibold text-white">
						No artifacts found
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">
						The compiled dataset has no entries on the Artifact Perks tab.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="flex-1">
			<Suspense fallback={null}>
				<ArtifactExplorer artifacts={artifacts} bundle={bundle} />
			</Suspense>
		</main>
	);
}
