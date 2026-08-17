"use client";

import { useEffect } from "react";

import { useTooltipAlignStore } from "@/lib/site/tooltipAlignStore";

// Store is created with skipHydration, so nothing reads localStorage until
// this fires post-mount — keeps the very first client render identical to
// the server-rendered HTML, then swaps in the persisted value right after.
export function TooltipAlignHydrator() {
	useEffect(() => {
		void useTooltipAlignStore.persist.rehydrate();
	}, []);

	return null;
}
