import {
	ARCHETYPE_FRAME_ALIASES,
	ARCHETYPES_TAB,
	BOSSES_TAB,
	DAMAGE_TAB,
	EXOTICS_TAB,
	PERKS_TAB,
	STATUS_TAB,
	SUSTAINED_TAB,
	SWAP_TAB,
	WEAPON_TIER_TABS,
} from "@/lib/aegis/config";
import {
	archetypeMatchKey,
	parseArchetypeTab,
	parseBossTab,
	parseDamageTab,
	parseExoticTab,
	parseStatusTab,
	parseSustainedTab,
	parseSwapTab,
	parseSymbolLegend,
	parseTierLegend,
	parseTierTab,
} from "@/lib/aegis/parse";
import { readAegisSheetSnapshot } from "@/lib/aegis/snapshot";
import {
	type BungieManifestSnapshotResolver,
	loadBungieManifestSnapshotResolver,
} from "@/lib/bungie/snapshot";

import {
	type ArchetypeRow,
	type ExoticWeaponRow,
	type SwapRow,
	type WeaponBreaker,
	type WeaponCategory,
	type WeaponsDataset,
	weaponsDatasetSchema,
	type WeaponTierRow,
} from "./model";

function requireTab(
	grid: Record<string, string[][]>,
	tab: string,
	script: string,
) {
	const rows = grid[tab];
	if (!rows) {
		throw new Error(
			`The Aegis snapshot has no "${tab}" tab. Re-run ${script}.`,
		);
	}
	return rows;
}

// A rated weapon carries a frame name; the Archetypes tab carries that frame's
// damage math and its ammo slot. Joining the two is what lets a tier row say
// which slot it occupies, which the tier tabs never state.
function joinArchetypes(
	tierRows: WeaponTierRow[],
	archetypes: ArchetypeRow[],
): { rows: WeaponTierRow[]; misses: string[]; ambiguous: string[] } {
	// A multimap, not a lookup: the sheet rates "Hand cannon / Dynamic" twice,
	// once as special ammo and once as primary. Keeping both candidates is what
	// lets an ambiguous key be reported rather than quietly resolved to whichever
	// row happened to be parsed last.
	const byMatchKey = new Map<string, ArchetypeRow[]>();
	for (const archetype of archetypes) {
		const existing = byMatchKey.get(archetype.matchKey);
		if (existing) existing.push(archetype);
		else byMatchKey.set(archetype.matchKey, [archetype]);
	}

	const tabByCategory = new Map(WEAPON_TIER_TABS.map((tab) => [tab.slug, tab]));
	const misses = new Set<string>();
	const ambiguous = new Set<string>();

	const rows = tierRows.map((row) => {
		const tab = tabByCategory.get(row.categorySlug);
		if (!tab?.archetypeWeapon || !row.frame) return row;

		const frame = ARCHETYPE_FRAME_ALIASES[row.frame] ?? row.frame;
		const label = `${tab.archetypeWeapon} / ${frame}`;
		const candidates = byMatchKey.get(
			archetypeMatchKey(tab.archetypeWeapon, frame),
		);

		if (!candidates) {
			misses.add(label);
			return row;
		}
		// The tier tabs carry no column that separates two same-named frames, so
		// there is nothing to choose on. Guessing would put a wrong ammo slot on
		// the weapon; leaving it unset only omits one label.
		if (candidates.length > 1) {
			ambiguous.add(label);
			return row;
		}

		const archetype = candidates[0];
		return { ...row, archetypeId: archetype.id, ammoSlot: archetype.ammoSlot };
	});

	return {
		rows,
		misses: [...misses].sort(),
		ambiguous: [...ambiguous].sort(),
	};
}

// DestinyBreakerType, named after the champion the weapon breaks rather than
// after the effect the manifest names it after.
const BREAKER_BY_ENUM: Record<number, WeaponBreaker> = {
	1: "Barrier",
	2: "Overload",
	3: "Unstoppable",
};

function resolveIcons<T extends { name: string; frame?: string }>(
	rows: T[],
	resolver: BungieManifestSnapshotResolver | null,
	misses: Set<string>,
): T[] {
	if (!resolver) return rows;

	return rows.map((row) => {
		// The frame only matters for the handful of names two different weapons
		// share, and the resolver falls back to the name for everything else.
		const enrichment = resolver.getWeaponEnrichmentByName(row.name, row.frame);
		if (!enrichment?.iconPath) {
			misses.add(row.name);
			return row;
		}
		// The champion this weapon's frame counters. A property of the frame
		// rather than of the weapon, so two weapons on the same frame always
		// agree, and an artifact perk can only add to it.
		const breaker = BREAKER_BY_ENUM[enrichment.breakerType ?? 0];

		return {
			...row,
			iconPath: enrichment.iconPath,
			watermarkPath: enrichment.watermarkPath,
			breaker,
			breakerIconPath: breaker
				? resolver.getGlyphIconPath(breaker.toLowerCase())
				: undefined,
		};
	});
}

export async function buildWeaponsDataset(): Promise<WeaponsDataset> {
	const [endgame, damage, resolver] = await Promise.all([
		readAegisSheetSnapshot("endgame"),
		readAegisSheetSnapshot("dps"),
		loadBungieManifestSnapshotResolver(),
	]);

	const script = "`bun run data:aegis:snapshot`";
	const rawTierRows = WEAPON_TIER_TABS.flatMap((layout) =>
		parseTierTab(requireTab(endgame.grid, layout.tab, script), layout),
	);
	const archetypes = parseArchetypeTab(
		requireTab(endgame.grid, ARCHETYPES_TAB.tab, script),
	);
	const rawExotics = parseExoticTab(
		requireTab(endgame.grid, EXOTICS_TAB.tab, script),
	);

	const joined = joinArchetypes(rawTierRows, archetypes);
	const iconMisses = new Set<string>();
	const tierRows = resolveIcons(joined.rows, resolver, iconMisses);
	const exotics = resolveIcons<ExoticWeaponRow>(
		rawExotics,
		resolver,
		iconMisses,
	);

	// The swap tab times supers, grenades and melees beside weapons, so a name
	// the weapon manifest does not know is expected here and is not worth a
	// build warning. Those rows fall back to a lettered square.
	const swaps = resolveIcons<SwapRow>(
		parseSwapTab(requireTab(damage.grid, SWAP_TAB.tab, script)),
		resolver,
		new Set<string>(),
	);

	const countBySlug = new Map<string, number>();
	for (const row of tierRows) {
		countBySlug.set(
			row.categorySlug,
			(countBySlug.get(row.categorySlug) ?? 0) + 1,
		);
	}
	const categories: WeaponCategory[] = WEAPON_TIER_TABS.map((tab) => ({
		slug: tab.slug,
		label: tab.weaponType,
		tab: tab.tab,
		gid: tab.gid,
		count: countBySlug.get(tab.slug) ?? 0,
	}));

	const dataset = {
		generatedAt: new Date().toISOString(),
		endgameGeneratedAt: endgame.generatedAt,
		damageGeneratedAt: damage.generatedAt,
		categories,
		tierRows,
		exotics,
		archetypes,
		damageShots: parseDamageTab(
			requireTab(damage.grid, DAMAGE_TAB.tab, script),
		),
		sustained: parseSustainedTab(
			requireTab(damage.grid, SUSTAINED_TAB.tab, script),
		),
		swaps,
		bosses: parseBossTab(requireTab(damage.grid, BOSSES_TAB.tab, script)),
		status: parseStatusTab(requireTab(endgame.grid, STATUS_TAB.tab, script)),
		tierLegend: parseTierLegend(
			requireTab(endgame.grid, PERKS_TAB.tab, script),
		),
		symbolLegend: parseSymbolLegend(
			requireTab(endgame.grid, EXOTICS_TAB.tab, script),
		),
		diagnostics: {
			iconMisses: [...iconMisses].sort(),
			archetypeMisses: joined.misses,
			ambiguousArchetypes: joined.ambiguous,
		},
	};

	return weaponsDatasetSchema.parse(dataset);
}
