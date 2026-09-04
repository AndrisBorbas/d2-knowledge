import type { Metadata } from "next";

import manifest from "@/../package.json";
import { InlineMarkdown } from "@/components/changelog/InlineMarkdown";
import { loadChangelog } from "@/lib/changelog/load";
import type { ChangelogSection } from "@/lib/changelog/parse";

// The changelog is a file on disk, so it is baked in at build time like every
// other route here.
export const dynamic = "force-static";

export const metadata: Metadata = {
	title: "Changelog",
	description:
		"What changed in each release of Owl Sector, newest first: new pages, new data, fixes and removals.",
	alternates: { canonical: "/changelog" },
};

// One accent per Keep a Changelog section, so a release can be skimmed by
// colour instead of read top to bottom.
const KIND_STYLES: Record<string, string> = {
	Added: "bg-emerald-500/15 text-emerald-200",
	Changed: "bg-blue-500/20 text-sky-100",
	Fixed: "bg-amber-500/15 text-amber-200",
	Removed: "bg-red-500/15 text-red-300",
	Deprecated: "bg-orange-500/15 text-orange-200",
	Security: "bg-fuchsia-500/15 text-fuchsia-200",
};

function kindClassName(kind: ChangelogSection["kind"]) {
	return (kind && KIND_STYLES[kind]) ?? "bg-white/10 text-white/70";
}

export default async function ChangelogPage() {
	const releases = await loadChangelog();

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 md:px-6 lg:px-8">
			<header className="mt-6">
				<p className="text-xs font-semibold tracking-[0.3em] text-white/45 uppercase">
					Owl Sector
				</p>
				<h1 className="text-masterwork text-shadow-masterwork/60 mt-2 text-4xl font-semibold text-shadow-[0px_0px_7px]">
					Changelog
				</h1>
				<p className="mt-3 text-sm leading-7 text-white/72">
					Everything that changed on the site, newest first. The site is
					currently on v{manifest.version}.
				</p>
			</header>

			{releases.length === 0 ? (
				<div className="borderHover bg-black/45 p-8 backdrop-blur-md">
					<p className="text-sm leading-7 text-white/72">
						No entries yet. Changes are recorded in CHANGELOG.md as they ship.
					</p>
				</div>
			) : (
				<ol className="flex flex-col gap-6 pb-10">
					{releases.map((release) => {
						const isCurrent = release.version === manifest.version;

						return (
							<li
								key={release.slug}
								id={release.slug}
								className="borderHover scroll-mt-20 bg-black/40 p-5 backdrop-blur-md md:p-6"
							>
								<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
									<h2 className="text-2xl font-semibold text-white">
										<a
											href={`#${release.slug}`}
											className="hover:text-masterwork transition-colors"
										>
											{release.isUnreleased
												? "Unreleased"
												: `v${release.version}`}
										</a>
									</h2>

									{release.date ? (
										<time
											dateTime={release.date}
											className="text-sm text-white/50"
										>
											{release.date}
										</time>
									) : null}

									{release.isUnreleased ? (
										<span className="bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100 uppercase">
											In progress
										</span>
									) : null}

									{isCurrent ? (
										<span className="bg-masterwork/20 text-masterwork px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
											Live
										</span>
									) : null}
								</div>

								<div className="mt-4 flex flex-col gap-4">
									{release.sections.map((section, sectionIndex) => (
										<section key={`${release.slug}-${sectionIndex}`}>
											{section.kind ? (
												<h3
													className={`inline-block px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] uppercase ${kindClassName(section.kind)}`}
												>
													{section.kind}
												</h3>
											) : null}

											<ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-7 text-white/72 marker:text-white/30">
												{section.items.map((item, itemIndex) => (
													<li
														key={`${release.slug}-${sectionIndex}-${itemIndex}`}
													>
														<InlineMarkdown text={item} />
													</li>
												))}
											</ul>
										</section>
									))}
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</main>
	);
}
