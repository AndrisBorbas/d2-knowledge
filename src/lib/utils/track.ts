import { useEffect } from "react";
import * as Swetrix from "swetrix";

export const TRACKING_ID = "nnP0JjPlBA7b";

export function useSwetrix(
	pid: string = TRACKING_ID,
	initOptions: Swetrix.LibOptions = {
		apiURL: "https://succ.andrisborbas.com/backend/log",
	},
	pageViewsOptions: Swetrix.PageViewsOptions = {},
	errorOptions: Swetrix.ErrorOptions = {},
) {
	useEffect(() => {
		Swetrix.init(pid, {
			disabled: process.env.NODE_ENV !== "production",
			...initOptions,
		});
		void Swetrix.trackViews(pageViewsOptions);
		void Swetrix.trackErrors(errorOptions);
	}, [errorOptions, initOptions, pageViewsOptions, pid]);
}
