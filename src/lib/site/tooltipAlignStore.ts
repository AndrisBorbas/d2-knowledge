import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TooltipAlign = "left" | "center";

type TooltipAlignState = {
	align: TooltipAlign;
	toggle: () => void;
};

// skipHydration: the persisted value must not be read during the initial
// render (server has no localStorage, and reading it eagerly on the client
// would make that first render disagree with the server-rendered HTML).
// <TooltipAlignHydrator> calls `.persist.rehydrate()` once mounted instead.
export const useTooltipAlignStore = create<TooltipAlignState>()(
	persist(
		(set, get) => ({
			align: "center",
			toggle: () =>
				set({ align: get().align === "left" ? "center" : "left" }),
		}),
		{ name: "tooltip-text-align", skipHydration: true },
	),
);
