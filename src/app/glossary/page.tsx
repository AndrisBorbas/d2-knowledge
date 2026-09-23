import type { Metadata } from "next";
import { Suspense } from "react";

import { CompendiumPreview } from "@/components/compendium/CompendiumPreview";
import { JsonLd } from "@/components/site/JsonLd";
import { buildTooltipBundle } from "@/lib/compendium/bundle";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import type { CompendiumDataset } from "@/lib/compendium/model";
import { buildPageMetadata } from "@/lib/site/meta";
import { buildGlossaryJsonLd } from "@/lib/site/structured-data";
import { pickEvenlySpaced } from "@/lib/utils/sample";

// Prerendered at build time. This is load-bearing for portability, not just
// cost: `loadCompendiumDataset` reads the dataset off disk, and runtimes like
// Cloudflare Workers have no filesystem at request time.
export const dynamic = "force-static";

// Enough to fill the tallest first screen. These stay pinned to the top of the
// list once the full dataset arrives (see `useEntryFiltering`), so they are
// spread across the whole dataset rather than taken off the front - otherwise
// every visit would open on 60 armor perks.
const SEED_ENTRY_COUNT = 60;

export const metadata: Metadata = buildPageMetadata({
	title: "Glossary",
	description:
		"Search every Destiny 2 perk, verb, mod and set bonus, with the community's hidden numbers spliced into the in-game text.",
	path: "/glossary",
});

export default async function GlossaryPage() {
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
			<main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
				<div className="w-full border border-red-400/25 bg-black/45 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
					<p className="text-xs font-semibold tracking-[0.3em] text-red-300/80 uppercase">
						Preview unavailable
					</p>
					<h1 className="mt-3 text-3xl font-semibold text-white">
						Failed to build the dataset
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">{errorMessage}</p>
				</div>
			</main>
		);
	}

	// Only the seed entries and the keywords their annotations point at get
	// serialized. Sending `dataset` whole put ~820 KB (gzipped) into the
	// prerendered payload, which every prefetch of this route then had to read.
	const seedEntries = pickEvenlySpaced(dataset.entries, SEED_ENTRY_COUNT);
	const seed: CompendiumDataset = {
		generatedAt: dataset.generatedAt,
		entries: seedEntries,
		keywords: buildTooltipBundle(dataset, seedEntries).keywords,
	};

	return (
		<main className="flex-1">
			<JsonLd data={buildGlossaryJsonLd(dataset.generatedAt)} />
			{/* Outside the Suspense boundary on purpose: the explorer reads the
			    URL through nuqs, so it only renders client side, and without this
			    the prerendered page has no heading or text at all. */}
			<header className="px-2 pt-4 pb-3">
				<h1 className="font-display text-2xl font-black text-white uppercase lg:text-3xl">
					Glossary
				</h1>
				<p className="mt-1 max-w-3xl text-sm leading-6 text-white/72">
					Search {dataset.entries.length.toLocaleString("en-US")} Destiny 2
					perks, verbs, mods and set bonuses, with the community&apos;s hidden
					numbers spliced into the in-game text.
				</p>
			</header>
			<Suspense fallback={null}>
				<CompendiumPreview seed={seed} />
			</Suspense>
		</main>
	);
}
