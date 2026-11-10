import {
	type DescriptionBlock,
	getDescriptionBlocks,
	selectDdcVariants,
} from "@/lib/compendium/descriptions";
import type { AnnotatedEntry, IconGlyph } from "@/lib/compendium/model";
import { splitDescriptionIconMarkers } from "@/lib/utils/iconGlyph";

import type { EntryCatalog } from "./catalog";
import {
	collectBuildEntryIds,
	collectReferencedEffects,
	type ResolvedBuild,
	type ResolvedItem,
	type ResolvedPlug,
} from "./resolve";

// A build as plain Markdown: every name with every description the site has
// for it, for a reader that wants the whole build as text rather than as a page
// of icons - which mostly means an AI asked to summarize it.

// Clarity writes its own icon glyphs as characters from the Private Use Area,
// which are blank anywhere that does not ship its font.
const PRIVATE_USE_CHARACTERS = /[-]/g;

// Inline icons in a description are numbered markers into the entry's glyph
// list. In text, the icon's name stands in for it - unless the description
// already says that word right after, as in "[Special icon] Special ammo".
function replaceIconMarkers(text: string, iconGlyphs: IconGlyph[] | undefined) {
	const parts = splitDescriptionIconMarkers(text);
	let result = "";

	parts.forEach((part, partIndex) => {
		if (part.type === "text") {
			result += part.text;
			return;
		}

		const label = iconGlyphs?.[part.glyphIndex]?.label;
		if (!label) return;

		const next = parts[partIndex + 1];
		const nextText = next?.type === "text" ? next.text.trim() : "";
		if (nextText.toLowerCase().startsWith(label.toLowerCase())) return;

		result += label;
	});

	return result;
}

function toPlainText(text: string, iconGlyphs: IconGlyph[] | undefined) {
	return replaceIconMarkers(text, iconGlyphs)
		.replace(PRIVATE_USE_CHARACTERS, "")
		.replace(/[ \t]{2,}/g, " ")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

const SOURCE_LABELS: Record<string, string> = {
	bungie: "In-game text",
	clarity: "Clarity",
	ddc: "Data Compendium",
	manual: "Site note",
};

function describeSource(block: DescriptionBlock) {
	const label = SOURCE_LABELS[block.sourceId] ?? block.sourceId;
	return block.variantLabel ? `${label} (${block.variantLabel})` : label;
}

// Indents a multi-line description so it stays inside its list item.
function indent(text: string, spaces: number) {
	const padding = " ".repeat(spaces);
	return text
		.split("\n")
		.map((line) => (line ? `${padding}${line}` : line))
		.join("\n");
}

// "Label: text" for a one-line text, and the label over the text for a longer
// one, where a label in front of the first line would read as part of it.
function labelText(label: string, text: string) {
	return text.includes("\n") ? `${label}:\n${text}` : `${label}: ${text}`;
}

function describeEntry(entry: AnnotatedEntry, ddcVariant: string | undefined) {
	const blocks = selectDdcVariants(getDescriptionBlocks(entry), ddcVariant);
	const lines: string[] = [];

	for (const block of blocks) {
		const text = toPlainText(block.text, block.iconGlyphs);
		if (text) lines.push(labelText(describeSource(block), text));
	}

	const extraInfo = entry.extraInfo
		? toPlainText(entry.extraInfo, undefined)
		: "";
	if (extraInfo) lines.push(labelText("Extra info", extraInfo));

	return lines;
}

// "- **Name** x2 (group, group)" and the description under it.
function renderEntryItem(
	title: string,
	entry: AnnotatedEntry | undefined,
	options: { count?: number; ddcVariant?: string },
) {
	const count =
		options.count !== undefined && options.count > 1
			? ` x${String(options.count)}`
			: "";
	const tags = entry?.groups.length ? ` (${entry.groups.join(", ")})` : "";
	const lines = [`- **${title}**${count}${tags}`];

	if (!entry) return lines.join("\n");

	for (const line of describeEntry(entry, options.ddcVariant)) {
		lines.push(indent(line, 2));
	}
	return lines.join("\n");
}

function renderPlugList(
	plugs: ResolvedPlug[],
	getEntry: (entryId: string) => AnnotatedEntry | undefined,
	ddcVariant?: string,
) {
	return plugs
		.map((plug) =>
			renderEntryItem(plug.name, getEntry(plug.entryId), {
				count: plug.count,
				ddcVariant,
			}),
		)
		.join("\n");
}

function renderItem(
	item: ResolvedItem,
	getEntry: (entryId: string) => AnnotatedEntry | undefined,
) {
	const details = [
		item.tierLabel,
		item.isEquipped ? "equipped" : "in inventory",
	].filter(Boolean);
	const name = item.name ?? `Unknown item (hash ${String(item.hash)})`;
	const parts = [`### ${name} (${details.join(", ")})`];

	const itemEntries = item.entryIds.map((entryId) => {
		const entry = getEntry(entryId);
		return renderEntryItem(entry?.title ?? entryId, entry, {});
	});
	const plugEntries = renderPlugList(item.plugs, getEntry);

	if (itemEntries.length > 0 || plugEntries) {
		parts.push([...itemEntries, plugEntries].filter(Boolean).join("\n"));
	} else {
		parts.push("This link does not include perks for this item.");
	}

	return parts.join("\n\n");
}

export function renderBuildMarkdown(
	build: ResolvedBuild,
	catalog: EntryCatalog,
): string {
	const manifestEntryById = new Map(
		build.manifestEntries.map((entry) => [entry.id, entry]),
	);
	const getEntry = (entryId: string) =>
		catalog.entryById.get(entryId) ?? manifestEntryById.get(entryId);

	const sections: string[] = [];

	const subtitle = [build.className, build.subclass?.name]
		.filter(Boolean)
		.join(" | ");
	sections.push(
		[`# ${build.name}`, subtitle, build.notes ? `Notes: ${build.notes}` : ""]
			.filter(Boolean)
			.join("\n\n"),
	);

	if (build.subclass) {
		const subclassParts = [
			`## Subclass: ${build.subclass.element} ${build.subclass.className}`,
		];
		for (const slot of build.subclass.slots) {
			subclassParts.push(
				`### ${slot.label}`,
				renderPlugList(slot.plugs, getEntry, build.subclass.element),
			);
		}
		sections.push(subclassParts.join("\n\n"));
	}

	if (build.weapons.length > 0) {
		sections.push(
			[
				"## Weapons",
				...build.weapons.map((item) => renderItem(item, getEntry)),
			].join("\n\n"),
		);
	}
	if (build.armor.length > 0) {
		sections.push(
			[
				"## Armor",
				...build.armor.map((item) => renderItem(item, getEntry)),
			].join("\n\n"),
		);
	}
	if (build.otherItems.length > 0) {
		sections.push(
			[
				"## Other items",
				...build.otherItems.map((item) => renderItem(item, getEntry)),
			].join("\n\n"),
		);
	}

	if (build.armorMods.length > 0) {
		sections.push(
			`## Armor mods\n\n${renderPlugList(build.armorMods, getEntry)}`,
		);
	}
	if (build.armorPerks.length > 0) {
		sections.push(
			`## Armor perks\n\n${renderPlugList(build.armorPerks, getEntry)}`,
		);
	}

	if (build.setBonuses.length > 0) {
		const setParts = ["## Armor set bonuses"];
		for (const bonus of build.setBonuses) {
			setParts.push(
				`### ${bonus.setName} (${String(bonus.pieceCount)} pieces)`,
				renderPlugList(bonus.plugs, getEntry),
			);
		}
		sections.push(setParts.join("\n\n"));
	}

	if (build.artifactPerks.length > 0) {
		sections.push(
			`## Artifact perks\n\n${renderPlugList(build.artifactPerks, getEntry)}`,
		);
	}

	const referencedEffects = collectReferencedEffects(
		collectBuildEntryIds(build),
		catalog,
	);
	if (referencedEffects.length > 0) {
		const effectItems = referencedEffects.map((effect) => {
			const entry = getEntry(effect.entryId);
			return renderEntryItem(entry?.title ?? effect.entryId, entry, {});
		});
		sections.push(
			[
				"## Referenced effects",
				"Effects that the descriptions above mention, most mentioned first.",
				effectItems.join("\n"),
			].join("\n\n"),
		);
	}

	if (build.unrecognizedHashes.length > 0) {
		sections.push(
			`## Not recognized\n\n${String(build.unrecognizedHashes.length)} item hashes are not in the site's data (usually shaders, ornaments, stat mods or newer gear): ${build.unrecognizedHashes.join(", ")}`,
		);
	}

	return `${sections.join("\n\n")}\n`;
}
