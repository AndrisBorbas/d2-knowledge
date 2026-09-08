import type { Metadata } from "next";
import Image from "next/image";

import { HoverPrefetchLink } from "@/components/site/HoverPrefetchLink";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import {
	CLASS_SLUGS,
	ELEMENT_SLUGS,
	findSubclass,
} from "@/lib/compendium/subclasses";

// Prerendered at build time, same as every other page here: the manifest
// snapshot is read off disk, which no request-time runtime can be relied on to
// have.
export const dynamic = "force-static";

export const metadata: Metadata = {
	title: "Abilities & Subclasses",
	description:
		"Every super, ability, aspect and fragment for all three classes and all six subclasses, grouped the way the game groups them.",
	alternates: { canonical: "/abilities" },
};

export default async function AbilitiesPage() {
	const resolver = await loadBungieManifestSnapshotResolver();
	const subclasses = resolver?.getSubclasses() ?? [];

	if (subclasses.length === 0) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-12">
				<div className="borderHover w-full bg-black/45 p-8 backdrop-blur-md">
					<h1 className="text-3xl font-semibold text-white">
						No subclasses found
					</h1>
					<p className="mt-4 text-sm leading-7 text-white/72">
						The Bungie manifest snapshot has no subclasses. Run bun run
						data:bungie:snapshot to rebuild it.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
			<div>
				<h1 className="text-3xl font-black text-white uppercase lg:text-5xl">
					Abilities & Subclasses
				</h1>
				<p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
					Every super, ability, aspect and fragment a class can equip, laid out
					similarly to the in-game screen.
				</p>
			</div>

			{CLASS_SLUGS.map((classSlug) => {
				const first = subclasses.find(
					(subclass) => subclass.classSlug === classSlug,
				);
				if (!first) return null;

				return (
					<section key={classSlug} className="flex flex-col gap-3">
						<h2 className="text-sm font-semibold tracking-[0.2em] text-white/62 uppercase">
							{first.className}
						</h2>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{ELEMENT_SLUGS.map((elementSlug) => {
								const subclass = findSubclass(
									subclasses,
									classSlug,
									elementSlug,
								);
								if (!subclass) return null;

								return (
									<HoverPrefetchLink
										key={elementSlug}
										href={`/abilities/${classSlug}/${elementSlug}`}
										className="borderHover relative flex h-32 items-end bg-white/5 transition hover:bg-white/12"
									>
										{subclass.screenshotPath ? (
											// The art is clipped here rather than on the link,
											// which would clip its own hover frame with it.
											<span className="absolute inset-0 overflow-hidden">
												<Image
													src={subclass.screenshotPath}
													alt=""
													fill
													sizes="(min-width: 1024px) 20rem, 100vw"
													className="object-cover object-center opacity-45"
												/>
											</span>
										) : null}
										<span className="relative flex items-center gap-2 p-3">
											{subclass.iconPath ? (
												<Image
													src={subclass.iconPath}
													alt=""
													width={36}
													height={36}
													className="size-9 object-contain"
												/>
											) : null}
											<span className="flex flex-col">
												<span className="text-lg font-semibold text-white">
													{subclass.element}
												</span>
												<span className="text-xs tracking-[0.16em] text-white/60 uppercase">
													{subclass.name}
												</span>
											</span>
										</span>
									</HoverPrefetchLink>
								);
							})}
						</div>
					</section>
				);
			})}
		</main>
	);
}
