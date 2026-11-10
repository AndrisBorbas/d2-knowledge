import { z } from "zod";

// DIM's loadout shape, as dim-api stores and serves it
// (https://github.com/DestinyItemManager/dim-api, api/shapes/loadouts.ts).
// Everything the inspector does not read is left out, and everything it does
// read is optional: a shared loadout only carries the properties that were set.

// socket index -> the plug item hash the loadout wants in that socket. JSON
// object keys are always strings.
const socketOverridesSchema = z.record(z.string(), z.number());

const loadoutItemSchema = z.object({
	hash: z.number(),
	socketOverrides: socketOverridesSchema.optional(),
});

const loadoutParametersSchema = z.object({
	// Armor mods, with repeats: three copies of a mod are three entries.
	mods: z.array(z.number()).optional(),
	// Exotic class item perks and similar armor perks, one entry per copy.
	perks: z.array(z.number()).optional(),
	// DestinyEquipableItemSetDefinition hash -> number of pieces wanted.
	setBonuses: z.record(z.string(), z.number()).optional(),
	artifactUnlocks: z
		.object({ unlockedItemHashes: z.array(z.number()) })
		.optional(),
});

export const dimLoadoutSchema = z.object({
	name: z.string().optional(),
	notes: z.string().optional(),
	// DestinyClass: 0 Titan, 1 Hunter, 2 Warlock, 3 any.
	classType: z.number().optional(),
	equipped: z.array(loadoutItemSchema).default([]),
	unequipped: z.array(loadoutItemSchema).default([]),
	parameters: loadoutParametersSchema.optional(),
});

export type DimLoadout = z.infer<typeof dimLoadoutSchema>;
export type DimLoadoutItem = z.infer<typeof loadoutItemSchema>;

export type DimLoadoutErrorCode =
	"invalid-link" | "not-found" | "unreachable" | "invalid-loadout";

// Carries a message that is fit to show the visitor as it is.
export class DimLoadoutError extends Error {
	readonly code: DimLoadoutErrorCode;

	constructor(code: DimLoadoutErrorCode, message: string) {
		super(message);
		this.name = "DimLoadoutError";
		this.code = code;
	}
}

// A dim.gg link only holds a share id, which dim-api turns back into the
// loadout. The other two forms hold the loadout itself.
export type DimLoadoutSource =
	{ kind: "share"; shareId: string } | { kind: "inline"; loadout: unknown };

// DIM generates 7 character base32 ids, but nothing here depends on that, so a
// looser pattern keeps a future id format working.
const SHARE_ID_PATTERN = /^[a-z0-9]{4,16}$/i;

const DIM_SHARE_HOSTS = new Set(["dim.gg", "www.dim.gg"]);
const DIM_APP_HOST_SUFFIX = "destinyitemmanager.com";

const INVALID_LINK_MESSAGE =
	"That does not look like a DIM build link. Paste a dim.gg link, a DIM link that contains a loadout, or the loadout JSON itself.";

function parseInlineLoadout(json: string): DimLoadoutSource {
	try {
		return { kind: "inline", loadout: JSON.parse(json) as unknown };
	} catch {
		throw new DimLoadoutError(
			"invalid-loadout",
			"The loadout in that link is not valid JSON.",
		);
	}
}

function parseUrl(raw: string) {
	// Lets "dim.gg/abcdefg/my-build" through without its scheme.
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
		? raw
		: `https://${raw}`;

	try {
		return new URL(withScheme);
	} catch {
		return null;
	}
}

export function parseDimInput(input: string): DimLoadoutSource {
	const raw = input.trim();
	if (!raw) {
		throw new DimLoadoutError("invalid-link", INVALID_LINK_MESSAGE);
	}

	if (raw.startsWith("{")) {
		return parseInlineLoadout(raw);
	}

	// A bare share id, copied out of the middle of a link.
	if (SHARE_ID_PATTERN.test(raw)) {
		return { kind: "share", shareId: raw.toLowerCase() };
	}

	const url = parseUrl(raw);
	if (!url) {
		throw new DimLoadoutError("invalid-link", INVALID_LINK_MESSAGE);
	}

	const host = url.hostname.toLowerCase();

	if (DIM_SHARE_HOSTS.has(host)) {
		const [shareId] = url.pathname.split("/").filter(Boolean);
		if (shareId && SHARE_ID_PATTERN.test(shareId)) {
			return { kind: "share", shareId: shareId.toLowerCase() };
		}
		throw new DimLoadoutError("invalid-link", INVALID_LINK_MESSAGE);
	}

	// The "Open Loadout in DIM" link on a dim.gg page, and DIM's own loadout
	// links, carry the whole loadout as URL-encoded JSON.
	if (
		host === DIM_APP_HOST_SUFFIX ||
		host.endsWith(`.${DIM_APP_HOST_SUFFIX}`)
	) {
		const loadoutParam = url.searchParams.get("loadout");
		if (loadoutParam) return parseInlineLoadout(loadoutParam);
	}

	throw new DimLoadoutError("invalid-link", INVALID_LINK_MESSAGE);
}

export function parseDimLoadout(value: unknown): DimLoadout {
	const result = dimLoadoutSchema.safeParse(value);
	if (!result.success) {
		throw new DimLoadoutError(
			"invalid-loadout",
			"That does not look like a DIM loadout.",
		);
	}
	return result.data;
}

// dim-api answers this one route with `Access-Control-Allow-Origin: *` and asks
// for no API key, which is what lets a static site resolve a share id with no
// server of its own. Every other route needs a DIM account.
const DIM_API_BASE = "https://api.destinyitemmanager.com";

export async function fetchSharedLoadout(
	shareId: string,
	signal?: AbortSignal,
): Promise<DimLoadout> {
	let response: Response;
	try {
		response = await fetch(
			`${DIM_API_BASE}/loadout_share?shareId=${encodeURIComponent(shareId)}`,
			{ signal },
		);
	} catch (error) {
		// An abort is the caller moving on, not a failure to report.
		if (signal?.aborted) throw error;
		throw new DimLoadoutError(
			"unreachable",
			"Could not reach DIM to look that link up. Open the link, copy the address of its Open Loadout in DIM button, and paste that here instead.",
		);
	}

	if (response.status === 404) {
		throw new DimLoadoutError(
			"not-found",
			"DIM has no loadout for that link. It may have expired or been deleted.",
		);
	}
	if (!response.ok) {
		throw new DimLoadoutError(
			"unreachable",
			`DIM answered with an error (HTTP ${String(response.status)}). Try again in a moment.`,
		);
	}

	const body = (await response.json()) as { loadout?: unknown };
	return parseDimLoadout(body.loadout);
}

// Whatever the visitor pasted, as a loadout.
export async function loadDimLoadout(
	input: string,
	signal?: AbortSignal,
): Promise<DimLoadout> {
	const source = parseDimInput(input);
	if (source.kind === "share") {
		return fetchSharedLoadout(source.shareId, signal);
	}
	return parseDimLoadout(source.loadout);
}
