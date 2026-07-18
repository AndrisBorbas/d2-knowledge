import { CompendiumPreview } from "@/components/CompendiumPreview";
import { buildCompendiumDataset } from "@/lib/sheet/compendium";

export default async function Home() {
	try {
		const dataset = await buildCompendiumDataset();

		return (
			<main className="flex-1">
				<CompendiumPreview dataset={dataset} />
			</main>
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown parser error";

		return (
			<main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
				<div className="w-full rounded-3xl border border-red-400/25 bg-black/45 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
					<p className="text-xs font-semibold tracking-[0.3em] text-red-300/80 uppercase">
						Preview unavailable
					</p>
					<h1 className="mt-3 text-3xl font-semibold text-white">
						Failed to build the compendium dataset
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">{message}</p>
				</div>
			</main>
		);
	}
}
