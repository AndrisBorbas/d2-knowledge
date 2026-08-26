"use client";

import Link from "next/link";
import { type ComponentProps, useState } from "react";

// `<Link>` prefetches a static route *in full* the moment it enters the
// viewport, and `/glossary` carries the whole compendium in its payload. The
// header is sticky, so every page view pulled that payload down whether or not
// anyone navigated. Waiting for intent keeps the navigation instant for people
// who actually click, without charging everyone else for it.
export function HoverPrefetchLink({
	onMouseEnter,
	onTouchStart,
	onFocus,
	...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
	const [intent, setIntent] = useState(false);

	return (
		<Link
			{...props}
			// null restores the default (viewport) prefetch, false disables it.
			prefetch={intent ? null : false}
			onMouseEnter={(event) => {
				setIntent(true);
				onMouseEnter?.(event);
			}}
			onTouchStart={(event) => {
				setIntent(true);
				onTouchStart?.(event);
			}}
			onFocus={(event) => {
				setIntent(true);
				onFocus?.(event);
			}}
		/>
	);
}
