import type { CompendiumDataset } from "../src/lib/compendium/model";
import { buildEntryCatalog, type EntryCatalog } from "../src/lib/dim/catalog";
import type { DimIndex } from "../src/lib/dim/index-schema";
import { DimLoadoutError, loadDimLoadout } from "../src/lib/dim/loadout";
import { renderBuildMarkdown } from "../src/lib/dim/markdown";
import { resolveBuild } from "../src/lib/dim/resolve";

// Cloudflare Pages Function for `/build.md`: the Build Inspector's answer as
// plain Markdown, for a reader that wants the whole build as text - an AI asked
// to summarize it, mostly. `/build.md?b=<dim.gg link>` mirrors the page's own
// `/build?b=<dim.gg link>`.
//
// The rest of the site is a static export, so this file is the one piece of
// server code. Pages picks it up from this directory on its own.

// The slice of Pages' event context the handler uses. Declared here instead of
// pulling in the Cloudflare types package for two fields.
type PagesContext = {
	request: Request;
	env: {
		// Serves the site's static files, which is where the data lives.
		ASSETS: { fetch: (request: Request) => Promise<Response> };
	};
};

type InspectorData = {
	index: DimIndex;
	catalog: EntryCatalog;
};

const COMPENDIUM_ASSET_PATH = "/assets/data/compendium.min.json";
const DIM_INDEX_ASSET_PATH = "/assets/data/dim-index.min.json";

// Kept for as long as the isolate lives, so only the first request after a cold
// start pays to parse the compendium. A failed load is not kept.
let cachedData: Promise<InspectorData> | null = null;

async function fetchAssetJson<T>(context: PagesContext, path: string) {
	const assetUrl = new URL(path, context.request.url);
	const response = await context.env.ASSETS.fetch(new Request(assetUrl));
	if (!response.ok) {
		throw new Error(`${path} answered HTTP ${String(response.status)}`);
	}
	return (await response.json()) as T;
}

async function loadInspectorData(
	context: PagesContext,
): Promise<InspectorData> {
	const [dataset, index] = await Promise.all([
		fetchAssetJson<CompendiumDataset>(context, COMPENDIUM_ASSET_PATH),
		fetchAssetJson<DimIndex>(context, DIM_INDEX_ASSET_PATH),
	]);
	return { index, catalog: buildEntryCatalog(dataset) };
}

function getInspectorData(context: PagesContext) {
	cachedData ??= loadInspectorData(context).catch((error: unknown) => {
		cachedData = null;
		throw error;
	});
	return cachedData;
}

const STATUS_BY_ERROR_CODE = {
	"invalid-link": 400,
	"invalid-loadout": 400,
	"not-found": 404,
	unreachable: 502,
} as const;

const USAGE_TEXT = `# Owl Sector build inspector

Add a DIM build link to read the whole build as Markdown:

    /build.md?b=https://dim.gg/<share id>/<name>

The link can also be a DIM link that carries a loadout, or the loadout JSON.
`;

function markdownResponse(body: string, status: number, cacheSeconds = 0) {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			// A share id always points at the same loadout, so a good answer can be
			// reused. An error should not stick.
			"Cache-Control":
				cacheSeconds > 0
					? `public, max-age=${String(cacheSeconds)}`
					: "no-store",
			"Access-Control-Allow-Origin": "*",
			"X-Robots-Tag": "noindex",
		},
	});
}

const ONE_HOUR_SECONDS = 3600;

export async function onRequestGet(context: PagesContext) {
	const input = new URL(context.request.url).searchParams.get("b")?.trim();
	if (!input) return markdownResponse(USAGE_TEXT, 400);

	try {
		const [loadout, data] = await Promise.all([
			loadDimLoadout(input),
			getInspectorData(context),
		]);

		const build = resolveBuild(loadout, data.index, data.catalog);
		return markdownResponse(
			renderBuildMarkdown(build, data.catalog),
			200,
			ONE_HOUR_SECONDS,
		);
	} catch (error) {
		if (error instanceof DimLoadoutError) {
			return markdownResponse(
				`# Could not read that build\n\n${error.message}\n`,
				STATUS_BY_ERROR_CODE[error.code],
			);
		}

		console.error("Build inspector failed", error);
		return markdownResponse(
			"# Could not read that build\n\nThe site's data did not load. Try again in a moment.\n",
			500,
		);
	}
}
