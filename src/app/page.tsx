import { Suspense } from "react";

import { CompendiumPreview } from "@/components/compendium/CompendiumPreview";
import { loadCompendiumDataset } from "@/lib/compendium/load";

export default async function Home() {
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

	return (
		<main className="flex-1">
			<Suspense fallback={null}>
				<CompendiumPreview dataset={dataset} />
			</Suspense>
		</main>
	);
}
