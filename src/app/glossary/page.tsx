import type { Metadata } from "next";
import { Suspense } from "react";

import { CompendiumPreview } from "@/components/compendium/CompendiumPreview";
import { buildTooltipBundle } from "@/lib/compendium/bundle";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import type { CompendiumDataset } from "@/lib/compendium/model";

// Prerendered at build time. This is load-bearing for portability, not just
// cost: `loadCompendiumDataset` reads the dataset off disk, and runtimes like
// Cloudflare Workers have no filesystem at request time.
export const dynamic = "force-static";

// Enough to fill the tallest first screen. The client swaps in the full dataset
// from the static asset as soon as it lands, so this only has to cover the gap.
const SEED_ENTRY_COUNT = 60;

export const metadata: Metadata = {
	title: "Glossary",
	description:
		"Search every Destiny 2 perk, verb, mod and set bonus, with the community's hidden numbers spliced into the in-game text.",
	alternates: { canonical: "/glossary" },
};

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
				<div className="w-full rounded-3xl border border-red-400/25 bg-black/45 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
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
	const seedEntries = dataset.entries.slice(0, SEED_ENTRY_COUNT);
	const seed: CompendiumDataset = {
		generatedAt: dataset.generatedAt,
		entries: seedEntries,
		keywords: buildTooltipBundle(dataset, seedEntries).keywords,
	};

	return (
		<main className="flex-1">
			<Suspense fallback={null}>
				<CompendiumPreview seed={seed} />
			</Suspense>
		</main>
	);
}
