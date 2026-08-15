import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	SKIPPED_GLYPH_CLASS_NAMES,
	STATIC_ICON_PATH_BY_GLYPH,
} from "@/lib/bungie/glyphs";
import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import type { Entry, IconGlyph } from "@/lib/compendium/model";
import {
	classifyUnifiedKind,
	type UnifiedEntry,
	type UnifiedSourceRef,
} from "@/lib/compendium/unified";
import { buildIconMarker } from "@/lib/utils/iconGlyph";
import { cleanupDescriptionText } from "@/lib/utils/text";

type FoundryLinePart = {
	text?: string;
	classNames?: string[];
};

type FoundryDescriptionBlock = {
	linesContent?: FoundryLinePart[];
	classNames?: string[];
};

type FoundryRecord = {
	hash: number;
	name: string;
	itemHash?: number;
	itemName?: string;
	type?: string;
	lastUpload?: number;
	descriptions?: {
		en?: FoundryDescriptionBlock[];
	};
};

type FoundryPayload = Record<string, FoundryRecord>;

function normalizeTitle(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function toTitleCase(value: string) {
	if (value.length === 0) return value;
	return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

type FlattenedFoundryDescription = {
	text: string;
	iconGlyphs: IconGlyph[];
};

function flattenFoundryDescription(
	blocks: FoundryDescriptionBlock[] | undefined,
	resolveGlyphIcon: (className: string) => string | undefined,
): FlattenedFoundryDescription {
	if (!blocks || blocks.length === 0) return { text: "", iconGlyphs: [] };

	const iconGlyphs: IconGlyph[] = [];
	const lines: string[] = [];

	for (const block of blocks) {
		if (block.classNames?.includes("spacer")) {
			lines.push("");
			continue;
		}

		if (!block.linesContent || block.linesContent.length === 0) {
			continue;
		}

		let line = "";
		for (const part of block.linesContent) {
			if (part.text) {
				line += part.text;
				continue;
			}

			const className = part.classNames?.[0];
			if (!className || SKIPPED_GLYPH_CLASS_NAMES.has(className)) {
				continue;
			}

			const label = toTitleCase(className);
			const iconPath = resolveGlyphIcon(className);
			if (iconPath) {
				iconGlyphs.push({ label, iconPath });
				line += `${buildIconMarker(iconGlyphs.length - 1)} `;
				continue;
			}

			line += `${label} `;
		}

		const normalized = line.trim();
		if (normalized.length > 0) {
			lines.push(normalized);
		}
	}

	return {
		text: cleanupDescriptionText(lines.join("\n")),
		iconGlyphs,
	};
}

export const FOUNDRY_FALLBACK_TAB = "Foundry";

function mapFoundryTypeToTab(type: string | undefined) {
	const normalized = (type ?? "").toLowerCase();
	if (normalized.includes("trait exotic")) return "Exotic Perks";
	if (normalized.includes("artifact")) return "Artifact Perks";
	if (
		normalized.includes("weapon trait") ||
		normalized.includes("weapon perk")
	) {
		return "Weapon Perks";
	}
	if (normalized.includes("armor mod")) return "Armor Mods";
	return FOUNDRY_FALLBACK_TAB;
}

function mapFoundryTypeToGroups(type: string | undefined): string[] {
	const normalized = (type ?? "").toLowerCase();
	const groups: string[] = [];

	if (normalized.startsWith("armor")) {
		groups.push("Armor Perks");
	} else if (normalized.startsWith("weapon") || normalized.includes("trait")) {
		groups.push("Weapon Perks");
	} else if (normalized.includes("artifact")) {
		groups.push("Artifact Perks");
	} else if (normalized.startsWith("subclass")) {
		groups.push("Abilities");
	}

	if (normalized.includes("exotic")) {
		groups.push("Exotic");
	}

	if (type?.trim()) {
		groups.push(type.trim());
	}

	return groups.length > 0 ? groups : [FOUNDRY_FALLBACK_TAB];
}

function toEntry(
	record: FoundryRecord,
	index: number,
	resolveGlyphIcon: (className: string) => string | undefined,
): Entry | null {
	const title = record.name?.trim() ?? "";
	if (!title) return null;

	const { text: description, iconGlyphs } = flattenFoundryDescription(
		record.descriptions?.en,
		resolveGlyphIcon,
	);
	if (!description) return null;

	const tabName = mapFoundryTypeToTab(record.type);
	const section = record.type?.trim() || "Foundry";

	return {
		id: `foundry:${record.hash}:${normalizeTitle(title)}`,
		tab: tabName,
		section,
		groups: mapFoundryTypeToGroups(record.type),
		source: {
			tab: "foundry",
			row: index,
			column: 0,
		},
		title,
		description,
		iconGlyphs: iconGlyphs.length > 0 ? iconGlyphs : undefined,
		extraInfo: record.itemName ? `Item: ${record.itemName}` : undefined,
	};
}

export async function loadFoundryRecords() {
	const filePath = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"foundry.json",
	);
	const contents = await readFile(filePath, "utf8");
	return JSON.parse(contents) as FoundryPayload;
}

export async function loadFoundrySource() {
	const payload = await loadFoundryRecords();
	const records = Object.values(payload);
	const bungieResolver = await loadBungieManifestSnapshotResolver();
	const resolveGlyphIcon = (className: string) =>
		STATIC_ICON_PATH_BY_GLYPH[className] ??
		bungieResolver?.getGlyphIconPath(className);

	const entries: Entry[] = [];
	const unifiedEntries: UnifiedEntry[] = [];

	for (let index = 0; index < records.length; index++) {
		const record = records[index];
		const entry = toEntry(record, index, resolveGlyphIcon);
		if (!entry) continue;

		entries.push(entry);

		const sourceRef: UnifiedSourceRef = {
			sourceId: "foundry",
			sourceKey: String(record.hash),
			hash: record.hash,
			itemHash: record.itemHash,
			itemName: record.itemName,
			type: record.type,
			updatedAt: record.lastUpload,
		};

		const enrichment = bungieResolver?.getExoticEnrichment({
			itemHash: record.itemHash,
			perkHash: record.hash,
		});
		const resolvedItemName = enrichment?.itemName ?? record.itemName;

		unifiedEntries.push({
			...entry,
			kind: classifyUnifiedKind({
				tab: entry.tab,
				section: entry.section,
				sourceType: record.type,
			}),
			sourceId: "foundry",
			sourceRefs: [sourceRef],
			title: enrichment?.perkName?.trim() || entry.title,
			secondaryName: resolvedItemName,
			iconPath: enrichment?.perkIconPath,
			secondaryIconPath: enrichment?.itemIconPath,
			itemHash: record.itemHash,
			perkHash: record.hash,
			extraInfo: resolvedItemName
				? `Item: ${resolvedItemName}`
				: entry.extraInfo,
		});
	}

	return {
		entries,
		unifiedEntries,
	};
}
