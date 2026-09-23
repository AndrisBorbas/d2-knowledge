import type { Metadata } from "next";
import Link from "next/link";

import manifest from "@/../package.json";
import {
	DPS_SHEET_NAME,
	DPS_SHEET_URL,
	ENDGAME_SHEET_NAME,
	ENDGAME_SHEET_URL,
	SHEET_AUTHOR,
	SHEET_AUTHOR_URL,
} from "@/lib/aegis/config";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import {
	buildPageMetadata,
	CLARITY_DISCORD_URL,
	CLARITY_URL,
	DATA_COMPENDIUM_SHEET_URL,
} from "@/lib/site/meta";

// Reads the dataset's timestamp off disk, so it is baked in at build time like
// every other route here.
export const dynamic = "force-static";

const REPO_URL = "https://github.com/AndrisBorbas/d2-knowledge";
const ISSUES_URL = `${REPO_URL}/issues`;
const OWNER_URL = "https://github.com/AndrisBorbas";

export const metadata: Metadata = buildPageMetadata({
	title: "About",
	description:
		"Who runs Owl Sector, where its Destiny 2 numbers come from, how often they are refreshed, and how to report a mistake.",
	path: "/about",
});

const LINK_CLASS =
	"decoration-masterwork/90 hover:text-masterwork text-white underline underline-offset-2 transition-all hover:underline-offset-4";

function ExternalLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={LINK_CLASS}
		>
			{children}
		</a>
	);
}

function Section({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className="borderHover scroll-mt-20 bg-black/40 p-5 backdrop-blur-md md:p-6"
		>
			<h2 id={`${id}-title`} className="text-2xl font-semibold text-white">
				{title}
			</h2>
			<div className="mt-4 flex flex-col gap-3 text-sm leading-7 text-white/72">
				{children}
			</div>
		</section>
	);
}

async function readGeneratedAt() {
	try {
		const dataset = await loadCompendiumDataset();
		return dataset.generatedAt;
	} catch {
		return null;
	}
}

export default async function AboutPage() {
	const generatedAt = await readGeneratedAt();

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 md:px-6 lg:px-8">
			<header className="mt-6">
				<p className="text-xs font-semibold tracking-[0.3em] text-white/45 uppercase">
					Owl Sector
				</p>
				<h1 className="text-masterwork text-shadow-masterwork/60 mt-2 text-4xl font-semibold text-shadow-[0px_0px_7px]">
					About
				</h1>
				<p className="mt-3 text-sm leading-7 text-white/72">
					Owl Sector collects the numbers Destiny 2 does not show you, the
					hidden values behind perks, abilities, weapons and game mechanics,
					and puts them next to the in-game text. The numbers are measured by
					the community; this site gathers them in one place.
				</p>
			</header>

			<div className="flex flex-col gap-6 pb-10">
				<Section id="sources" title="Where the numbers come from">
					<p>
						Nothing here is measured by Owl Sector itself. Every value comes
						from one of these community projects, and each is credited on the
						page that uses it:
					</p>
					<ul className="list-disc space-y-2 pl-5">
						<li>
							The{" "}
							<ExternalLink href={DATA_COMPENDIUM_SHEET_URL}>
								Destiny Data Compendium
							</ExternalLink>{" "}
							sheet: sandbox numbers for perks, abilities, mods and armor
							sets, and the write-ups on the{" "}
							<Link href="/mechanics" className={LINK_CLASS}>
								Game Mechanics
							</Link>{" "}
							page.
						</li>
						<li>
							<ExternalLink href={CLARITY_URL}>Clarity</ExternalLink>: the
							community perk descriptions shown in the{" "}
							<Link href="/glossary" className={LINK_CLASS}>
								Glossary
							</Link>
							.
						</li>
						<li>
							<ExternalLink href={ENDGAME_SHEET_URL}>
								{ENDGAME_SHEET_NAME}
							</ExternalLink>{" "}
							and the{" "}
							<ExternalLink href={DPS_SHEET_URL}>{DPS_SHEET_NAME}</ExternalLink>{" "}
							by <ExternalLink href={SHEET_AUTHOR_URL}>{SHEET_AUTHOR}</ExternalLink>
							: the ratings, archetype math and boss damage on the{" "}
							<Link href="/weapons" className={LINK_CLASS}>
								Weapons
							</Link>{" "}
							page.
						</li>
						<li>
							The Bungie API manifest: item names, icons, in-game descriptions
							and how each subclass is laid out.
						</li>
					</ul>
					<p>
						A <code className="text-white/85">?</code> next to a value means
						nobody has measured it yet.
					</p>
				</Section>

				<Section id="updates" title="How it is kept up to date">
					<p>
						Each source is snapshotted and compiled into a single dataset,
						and the site is rebuilt from it as a set of static pages. The
						snapshots are refreshed by hand when the sources change.
					</p>
					{generatedAt ? (
						<p>
							The data on the site was last refreshed on{" "}
							<time dateTime={generatedAt} className="text-white">
								{generatedAt.slice(0, 10)}
							</time>
							. Every change to the site itself is listed in the{" "}
							<Link href="/changelog" className={LINK_CLASS}>
								changelog
							</Link>
							; it is currently on v{manifest.version}.
						</p>
					) : null}
				</Section>

				<Section id="report" title="Reporting a mistake">
					<p>
						If a number looks wrong, the fix usually belongs upstream, so the
						correction reaches everyone who uses that source. Perk description
						feedback goes to the{" "}
						<ExternalLink href={CLARITY_DISCORD_URL}>
							Clarity Discord
						</ExternalLink>
						.
					</p>
					<p>
						If the site shows something differently from its source, or
						something is broken, open an issue on{" "}
						<ExternalLink href={ISSUES_URL}>GitHub</ExternalLink>.
					</p>
				</Section>

				<Section id="maintainer" title="Who runs it">
					<p>
						Owl Sector is built and maintained by{" "}
						<ExternalLink href={OWNER_URL}>AndrisBorbas</ExternalLink>. The
						source code is{" "}
						<ExternalLink href={REPO_URL}>open on GitHub</ExternalLink>.
					</p>
					<p>
						Destiny is a registered trademark of Bungie. Owl Sector is a fan
						project and is not affiliated with Bungie.
					</p>
				</Section>
			</div>
		</main>
	);
}
