"use client";

import Image from "next/image";

import type { Subclass } from "@/lib/compendium/subclasses";

type SubclassBackdropProps = {
	subclass: Subclass;
};

// The subclass item's own `screenshot` - the art the game paints behind the
// subclass screen. Sits above the site background (also -z-1, but earlier in
// the DOM) and below the page content.
export function SubclassBackdrop({ subclass }: SubclassBackdropProps) {
	if (!subclass.screenshotPath) return null;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-1 overflow-hidden"
		>
			<Image
				src={subclass.screenshotPath}
				alt=""
				fill
				priority
				sizes="100vw"
				className="object-cover object-center opacity-25 lg:opacity-40"
			/>
			<div className="from-background via-background/70 absolute inset-0 bg-gradient-to-b to-transparent" />
		</div>
	);
}
