import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import manifest from "../package.json" with { type: "json" };
import { loadBungieManifestSnapshotResolver } from "../src/lib/bungie/snapshot";
import { loadChangelog } from "../src/lib/changelog/load";
import {
	buildArtifacts,
	getArtifactPerkEntries,
} from "../src/lib/compendium/artifacts";
import { loadCompendiumDataset } from "../src/lib/compendium/load";
import { buildSubclasses } from "../src/lib/compendium/subclasses";
import { ogImagePath } from "../src/lib/site/meta";
import {
	fetchImageDataUri,
	OG_ACCENTS,
	type OgStat,
	renderOgImage,
} from "../src/lib/site/og";
import { loadWeaponsDataset } from "../src/lib/weapons/load";

// One share card per page, written into public/ where any static host serves
// it with its own `.png` content type. Next's `opengraph-image` convention
// would render the same images, but it serves them from extensionless URLs,
// and Cloudflare types those as `application/octet-stream`, which Discord
// refuses to embed. The files are derived, so they are gitignored and rebuilt
// by `bun run assets:prepare` before every dev run and build.
const OUTPUT_DIR = ["public", "assets", "og"];

// A card only changes when the data behind it, the renderer, or this file
// does. Regenerating 20+ PNGs on every `bun run dev` is not worth it.
const INPUTS = [
	["data"],
	["src", "lib", "site", "og.tsx"],
	["scripts", "generate-og-images.mts"],
	["package.json"],
	["CHANGELOG.md"],
];

const EYEBROW = "Destiny 2 Knowledge Base";

type Card = {
	path: string;
	title: string;
	description: string;
	accent?: string;
	stats?: OgStat[];
	icon?: string | null;
};

async function newestInputMtime() {
	const files: string[] = [];

	for (const segments of INPUTS) {
		const target = path.join(process.cwd(), ...segments);
		const entry = await stat(target).catch(() => null);
		if (!entry) continue;

		// A directory's own mtime does not move when a file inside it is
		// rewritten in place, which is exactly what the snapshot scripts do.
		if (entry.isDirectory()) {
			const names = await readdir(target);
			files.push(...names.map((name) => path.join(target, name)));
		} else {
			files.push(target);
		}
	}

	const times = await Promise.all(
		files.map(
			async (file) => (await stat(file).catch(() => null))?.mtimeMs ?? 0,
		),
	);
	return Math.max(0, ...times);
}

async function collectCards(): Promise<Card[]> {
	const [dataset, weapons, resolver, releases] = await Promise.all([
		loadCompendiumDataset().catch(() => null),
		loadWeaponsDataset().catch(() => null),
		loadBungieManifestSnapshotResolver().catch(() => null),
		loadChangelog().catch(() => []),
	]);

	const artifacts = dataset ? buildArtifacts(dataset.entries) : [];
	const perkCount = dataset
		? getArtifactPerkEntries(dataset.entries).length
		: 0;
	const rawSubclasses = resolver?.getSubclasses() ?? [];
	const subclasses =
		dataset && rawSubclasses.length > 0
			? buildSubclasses(dataset.entries, rawSubclasses)
			: [];

	const cards: Card[] = [
		{
			path: "/glossary",
			title: "Glossary",
			description:
				"Search every Destiny 2 perk, verb, mod and set bonus, with the community's hidden numbers spliced into the in-game text.",
			stats: dataset
				? [
						{ label: "Entries", value: String(dataset.entries.length) },
						{ label: "Keywords", value: String(dataset.keywords.length) },
					]
				: [],
		},
		{
			path: "/weapons",
			title: "Weapons",
			description:
				"Every Destiny 2 legendary and exotic weapon rated for endgame PvE, with damage numbers and swap DPS.",
			accent: OG_ACCENTS.solar,
			stats: weapons
				? [
						{ label: "Rated", value: String(weapons.tierRows.length) },
						{ label: "Exotics", value: String(weapons.exotics.length) },
					]
				: [],
		},
		{
			path: "/artifacts",
			title: "Artifacts",
			description:
				"Every Destiny 2 artifact perk laid out the way the game shows it, with the community's hidden numbers on hover.",
			accent: OG_ACCENTS.void,
			stats: artifacts.length
				? [
						{ label: "Artifacts", value: String(artifacts.length) },
						{ label: "Perks", value: String(perkCount) },
					]
				: [],
		},
		{
			path: "/abilities",
			title: "Abilities & Subclasses",
			description:
				"Every super, ability, aspect and fragment for all three classes and all six subclasses, grouped the way the game groups them.",
			accent: OG_ACCENTS.arc,
			stats: subclasses.length
				? [
						{ label: "Subclasses", value: String(subclasses.length) },
						{ label: "Classes", value: "3" },
					]
				: [],
		},
		{
			path: "/changelog",
			title: "Changelog",
			description:
				"What changed in each release of Owl Sector, newest first: new pages, new data, fixes and removals.",
			accent: OG_ACCENTS.strand,
			stats: [
				{ label: "Version", value: `v${manifest.version}` },
				{ label: "Releases", value: String(releases.length) },
			],
		},
	];

	for (const subclass of subclasses) {
		const countSlot = (slotId: string) =>
			subclass.slots.find((slot) => slot.id === slotId)?.options.length ?? 0;

		cards.push({
			path: `/abilities/${subclass.classSlug}/${subclass.elementSlug}`,
			title: `${subclass.element} ${subclass.className}`,
			description: `Every super, ability, aspect and fragment a ${subclass.element} ${subclass.className} can equip, with the community's hidden numbers.`,
			accent:
				OG_ACCENTS[subclass.elementSlug as keyof typeof OG_ACCENTS] ??
				OG_ACCENTS.default,
			stats: [
				{ label: "Aspects", value: String(countSlot("aspects")) },
				{ label: "Fragments", value: String(countSlot("fragments")) },
				{ label: "Supers", value: String(countSlot("supers")) },
			].filter((stat) => stat.value !== "0"),
			// The snapshot stores an absolute bungie.net URL, and satori cannot
			// fetch one itself, so the icon is downloaded and inlined.
			icon: subclass.iconPath
				? await fetchImageDataUri(subclass.iconPath)
				: null,
		});
	}

	return cards;
}

async function main() {
	const force = process.argv.includes("--force");
	const outputDir = path.join(process.cwd(), ...OUTPUT_DIR);
	await mkdir(outputDir, { recursive: true });

	const inputMtime = await newestInputMtime();
	const cards = await collectCards();

	let written = 0;
	for (const card of cards) {
		const file = path.join(outputDir, path.basename(ogImagePath(card.path)));

		if (!force) {
			const existing = await stat(file).catch(() => null);
			if (existing && existing.mtimeMs >= inputMtime) continue;
		}

		const image = await renderOgImage({
			eyebrow: card.path.startsWith("/abilities/")
				? "Abilities & Subclasses"
				: EYEBROW,
			title: card.title,
			description: card.description,
			path: card.path,
			accent: card.accent,
			stats: card.stats,
			icon: card.icon,
		});

		await writeFile(file, Buffer.from(await image.arrayBuffer()));
		written += 1;
	}

	console.log(
		written === 0
			? `Share cards are up to date: ${cards.length} in ${outputDir}`
			: `Rendered ${written} share card${written === 1 ? "" : "s"} into ${outputDir}`,
	);
}

await main();
