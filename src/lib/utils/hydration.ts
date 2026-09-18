"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

// False during the prerender and the hydrating render, true after. Every page
// is prerendered with `force-static`, which builds the HTML with empty search
// params, so anything read from the URL has to wait for this before it reaches
// the markup, or a shared link like `/glossary?q=...` fails to hydrate.
export function useHydrated() {
	return useSyncExternalStore(
		subscribeToNothing,
		() => true,
		() => false,
	);
}
