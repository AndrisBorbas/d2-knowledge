"use client";

import { createContext, useContext } from "react";

// The DDC sheet tab a page is about (a subclass page's element), so a tooltip
// on it shows that tab's write-up of an ability rather than every tab's.
// Pages about no particular subclass leave it unset and show them all.
const DdcVariantContext = createContext<string | undefined>(undefined);

export const DdcVariantProvider = DdcVariantContext.Provider;

export function useDdcVariant() {
	return useContext(DdcVariantContext);
}
