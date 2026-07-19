import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadBungieManifestSnapshotResolver } from "@/lib/bungie/snapshot";
import type { Entry } from "@/lib/sheet/model";

import {
	classifyUnifiedKind,
	type UnifiedEntry,
	type UnifiedSourceRef,
} from "../unified/model";

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

const ELEMENT_CLASS_NAMES = new Set([
	"arc",
	"solar",
	"void",
	"stasis",
	"strand",
	"prismatic",
]);

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

function cleanupText(value: string) {
	return value
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
}

function flattenFoundryDescription(
	blocks: FoundryDescriptionBlock[] | undefined,
) {
	if (!blocks || blocks.length === 0) return "";

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

			const className = part.classNames?.[0]?.toLowerCase();
			if (className && ELEMENT_CLASS_NAMES.has(className)) {
				line += `${toTitleCase(className)} `;
			}
		}

		const normalized = line.trim();
		if (normalized.length > 0) {
			lines.push(normalized);
		}
	}

	return cleanupText(lines.join("\n"));
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

function toEntry(record: FoundryRecord, index: number): Entry | null {
	const title = record.name?.trim() ?? "";
	if (!title) return null;

	const description = flattenFoundryDescription(record.descriptions?.en);
	if (!description) return null;

	const tabName = mapFoundryTypeToTab(record.type);
	const section = record.type?.trim() || "Foundry";

	return {
		id: `foundry:${record.hash}:${normalizeTitle(title)}`,
		tab: tabName,
		section,
		source: {
			tab: "foundry",
			row: index,
			column: 0,
		},
		title,
		description,
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

	const entries: Entry[] = [];
	const unifiedEntries: UnifiedEntry[] = [];

	for (let index = 0; index < records.length; index++) {
		const record = records[index];
		const entry = toEntry(record, index);
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
