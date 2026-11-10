"use client";

import { useEffect, useState } from "react";

import {
	type DimLoadout,
	DimLoadoutError,
	loadDimLoadout,
} from "@/lib/dim/loadout";

type LoadoutResult =
	| { input: string; loadout: DimLoadout; errorMessage?: undefined }
	| { input: string; loadout?: undefined; errorMessage: string };

// Looks up whatever was pasted. Loading is derived rather than stored: it is
// whatever the latest input has no result for yet, so a stale answer for an
// earlier link is never shown against a newer one.
export function useDimLoadout(input: string | null) {
	const [result, setResult] = useState<LoadoutResult | null>(null);

	useEffect(() => {
		if (!input) return;

		const controller = new AbortController();

		async function load(pastedInput: string) {
			try {
				const loadout = await loadDimLoadout(pastedInput, controller.signal);
				setResult({ input: pastedInput, loadout });
			} catch (error) {
				// The visitor moved on to another link.
				if (controller.signal.aborted) return;

				setResult({
					input: pastedInput,
					errorMessage:
						// Only our own errors are worded for a visitor. Anything else is
						// a bug or a broken response, which a raw message would not help.
						error instanceof DimLoadoutError
							? error.message
							: "Something went wrong reading that build.",
				});
			}
		}

		void load(input);
		return () => controller.abort();
	}, [input]);

	const current = input && result?.input === input ? result : null;

	return {
		isLoading: input !== null && current === null,
		loadout: current?.loadout,
		errorMessage: current?.errorMessage,
	};
}
