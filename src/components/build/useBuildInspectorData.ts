"use client";

import { useEffect, useState } from "react";

import { COMPENDIUM_ASSET_URL } from "@/lib/compendium/asset";
import type { CompendiumDataset } from "@/lib/compendium/model";
import { buildEntryCatalog, type EntryCatalog } from "@/lib/dim/catalog";
import { DIM_INDEX_ASSET_URL, type DimIndex } from "@/lib/dim/index-schema";

export type BuildInspectorData = {
	index: DimIndex;
	catalog: EntryCatalog;
};

type DataState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| ({ status: "ready" } & BuildInspectorData);

async function fetchJson<T>(url: string, signal: AbortSignal) {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
	// Not zod-parsed, like the other build artifacts: same origin, written by
	// our own scripts, and the compendium alone is ~4.6 MB.
	return (await response.json()) as T;
}

// Both files are static assets the browser caches, and the compendium is the
// same one the glossary fetches. Loaded on mount rather than on the first
// lookup so a pasted link resolves the moment DIM answers.
export function useBuildInspectorData() {
	const [state, setState] = useState<DataState>({ status: "loading" });

	useEffect(() => {
		const controller = new AbortController();

		async function load() {
			try {
				const [dataset, index] = await Promise.all([
					fetchJson<CompendiumDataset>(COMPENDIUM_ASSET_URL, controller.signal),
					fetchJson<DimIndex>(DIM_INDEX_ASSET_URL, controller.signal),
				]);
				setState({
					status: "ready",
					index,
					catalog: buildEntryCatalog(dataset),
				});
			} catch (error) {
				if (controller.signal.aborted) return;
				console.error("Failed to load the build inspector data", error);
				setState({
					status: "error",
					message:
						"The glossary data did not load. Reload the page to try again.",
				});
			}
		}

		void load();
		return () => controller.abort();
	}, []);

	return state;
}
