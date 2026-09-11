import type { Metadata } from "next";
import { Suspense } from "react";

import { WeaponsExplorer } from "@/components/weapons/WeaponsExplorer";
import { loadWeaponsDataset } from "@/lib/weapons/load";
import type { WeaponsDataset } from "@/lib/weapons/model";

// Prerendered at build time. This is load-bearing for portability, not just
// cost: `loadWeaponsDataset` reads the dataset off disk, and runtimes like
// Cloudflare Workers have no filesystem at request time.
export const dynamic = "force-static";

export const metadata: Metadata = {
	title: "Weapons",
	description:
		"Every Destiny 2 legendary and exotic weapon rated for endgame PvE, with archetype damage math and measured boss DPS.",
	alternates: { canonical: "/weapons" },
};

export default async function WeaponsPage() {
	let dataset: WeaponsDataset | null = null;
	let errorMessage: string | null = null;

	try {
		dataset = await loadWeaponsDataset();
	} catch (error) {
		errorMessage =
			error instanceof Error ? error.message : "Unknown parser error";
	}

	if (!dataset) {
		return (
			<main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
				<div className="w-full rounded-3xl border border-red-400/25 bg-black/45 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
					<p className="text-xs font-semibold tracking-[0.3em] text-red-300/80 uppercase">
						Weapons unavailable
					</p>
					<h1 className="mt-3 text-3xl font-semibold text-white">
						Failed to build the weapons dataset
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">{errorMessage}</p>
				</div>
			</main>
		);
	}

	// Only the first category's rows are prerendered, then the browser fetches
	// the rest. A tier list is ranked, so the seed has to be a complete tab: a
	// sample spread across all 20 would render a visibly wrong order until the
	// full dataset landed.
	const firstCategory = dataset.categories[0];
	const seed: WeaponsDataset = {
		...dataset,
		tierRows: dataset.tierRows.filter(
			(row) => row.categorySlug === firstCategory.slug,
		),
		exotics: [],
		// Only the default view's data is prerendered. The archetype table alone
		// is ~250 KB of numbers, which every prefetch of this route would have
		// had to read before anyone switched to it.
		archetypes: [],
		damageShots: [],
		sustained: [],
		bosses: [],
	};

	return (
		<main className="flex-1">
			<Suspense fallback={null}>
				<WeaponsExplorer seed={seed} />
			</Suspense>
		</main>
	);
}
