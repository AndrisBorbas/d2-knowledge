import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { GlossarySearchBox } from "@/components/home/GlossarySearchBox";
import { HighlightsShowcase } from "@/components/home/HighlightsShowcase";
import { SectionCards } from "@/components/home/SectionCards";
import { StatTiles } from "@/components/site/StatTiles";
import { buildTooltipBundle } from "@/lib/compendium/bundle";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import type { AnnotatedEntry } from "@/lib/compendium/model";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site/meta";

// The highlights are picked at random per request; without this the page would
// be prerendered once at build and always show the same entries.
export const dynamic = "force-dynamic";

const HIGHLIGHT_POOL_SIZE = 27;

export const metadata: Metadata = {
	alternates: { canonical: SITE_URL },
};

function pickHighlightPool(entries: AnnotatedEntry[]) {
	const candidates = entries.filter(
		(entry) => entry.iconPath && entry.description.trim().length > 0,
	);

	const picked: AnnotatedEntry[] = [];
	const seen = new Set<number>();
	const size = Math.min(HIGHLIGHT_POOL_SIZE, candidates.length);

	while (picked.length < size) {
		const index = Math.floor(Math.random() * candidates.length);
		if (seen.has(index)) continue;
		seen.add(index);
		picked.push(candidates[index]);
	}

	return picked;
}

export default async function HomePage() {
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

	const bundle = buildTooltipBundle(
		dataset,
		pickHighlightPool(dataset.entries),
	);
	const annotationCount = dataset.entries.reduce(
		(count, entry) => count + entry.annotations.length,
		0,
	);

	return (
		<main className="flex w-full flex-1 flex-col gap-10 p-4 md:px-6 lg:px-8">
			<section className="flex flex-col gap-4 pt-4">
				<span className="flex items-center gap-2">
					<Image
						src="/assets/icons/owlsector.svg"
						alt=""
						width={96}
						height={96}
					/>
					<h1 className="text-masterwork text-shadow-masterwork/70 text-5xl font-semibold text-shadow-[0px_0px_10px]">
						Owl Sector
					</h1>
				</span>
				<h2 className="max-w-3xl text-base leading-7 text-white/80">
					{SITE_DESCRIPTION}
				</h2>
				<div className="max-w-3xl">
					<Suspense fallback={null}>
						<GlossarySearchBox />
					</Suspense>
				</div>
			</section>

			<SectionCards />

			<Suspense fallback={null}>
				<HighlightsShowcase bundle={bundle} />
			</Suspense>

			<StatTiles
				tiles={[
					{ label: "Entries", value: String(dataset.entries.length) },
					{ label: "Keywords", value: String(dataset.keywords.length) },
					{ label: "Annotations", value: String(annotationCount) },
				]}
			/>
		</main>
	);
}
