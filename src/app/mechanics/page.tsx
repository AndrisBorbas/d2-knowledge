import type { Metadata } from "next";

import { MechanicsBlocks } from "@/components/mechanics/MechanicsBlocks";
import { MechanicsContents } from "@/components/mechanics/MechanicsContents";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import {
	attachModifierIcons,
	loadGameMechanics,
	type MechanicsChapter,
} from "@/lib/ddc/mechanics";
import { buildPageMetadata, DATA_COMPENDIUM_SHEET_URL } from "@/lib/site/meta";

// Read off the sheet snapshot on disk, so it is baked in at build time like
// every other route here.
export const dynamic = "force-static";

export const metadata: Metadata = buildPageMetadata({
	title: "Game Mechanics",
	description:
		"How Destiny 2 works under the hood: ability energy, activity modifiers, character stats, Champions, combatant tiers, Banes, heat weapons and Super energy, from the Destiny Data Compendium.",
	path: "/mechanics",
});

export default async function MechanicsPage() {
	let chapters: MechanicsChapter[] = [];
	let errorMessage: string | null = null;

	try {
		const [parsed, resolver] = await Promise.all([
			loadGameMechanics(),
			loadBungieManifestSnapshotResolver(),
		]);
		chapters = resolver
			? attachModifierIcons(parsed, (name) =>
					resolver.getActivityModifierIconPath(name),
				)
			: parsed;
	} catch (error) {
		errorMessage =
			error instanceof Error ? error.message : "Unknown parser error";
	}

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 p-4 md:px-6 lg:px-8">
			<header className="mt-6 max-w-3xl">
				<p className="text-xs font-semibold tracking-[0.3em] text-white/45 uppercase">
					Destiny Data Compendium
				</p>
				<h1 className="text-masterwork text-shadow-masterwork/60 mt-2 text-4xl font-semibold text-shadow-[0px_0px_7px]">
					Game Mechanics
				</h1>
				<p className="mt-3 text-sm leading-7 text-white/72">
					The systems underneath the perks: how ability energy scales, what
					every activity modifier does, what your stats buy you, and how
					Champions, Banes and heat weapons behave. Written and measured by the{" "}
					<a
						href={DATA_COMPENDIUM_SHEET_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="decoration-masterwork/90 hover:text-masterwork text-white underline underline-offset-2 transition-all hover:underline-offset-4"
					>
						Destiny Data Compendium
					</a>
					. A <code className="text-white/85">?</code> marks a value nobody has
					measured yet.
				</p>
			</header>

			{errorMessage ? (
				<div className="borderHover bg-black/45 p-8 backdrop-blur-md">
					<h2 className="text-2xl font-semibold text-white">
						Failed to load the mechanics
					</h2>
					<p className="mt-4 text-sm leading-7 text-white/72">{errorMessage}</p>
				</div>
			) : (
				<div className="grid gap-8 pb-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
					<aside className="h-fit bg-black/40 p-4 backdrop-blur-md lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
						<MechanicsContents
							chapters={chapters.map((chapter) => ({
								id: chapter.id,
								title: chapter.title,
								headings: chapter.blocks.flatMap((block) =>
									block.kind === "heading"
										? [{ id: block.id, title: block.title }]
										: [],
								),
							}))}
						/>
					</aside>

					<div className="flex min-w-0 flex-col gap-6">
						{chapters.map((chapter) => (
							<section
								key={chapter.id}
								id={chapter.id}
								aria-labelledby={`${chapter.id}-title`}
								className="borderHover scroll-mt-20 bg-black/40 p-5 backdrop-blur-md md:p-6"
							>
								<h2
									id={`${chapter.id}-title`}
									className="mb-5 text-2xl font-semibold text-white"
								>
									<a
										href={`#${chapter.id}`}
										className="hover:text-masterwork transition-colors"
									>
										{chapter.title}
									</a>
								</h2>
								<MechanicsBlocks blocks={chapter.blocks} />
							</section>
						))}
					</div>
				</div>
			)}
		</main>
	);
}
