import type { Metadata } from "next";
import { Suspense } from "react";

import { BuildInspector } from "@/components/build/BuildInspector";
import { buildPageMetadata } from "@/lib/site/meta";

// Prerendered at build time like every other route. The page itself needs no
// data on the server: the build is looked up in the browser.
export const dynamic = "force-static";

export const metadata: Metadata = buildPageMetadata({
	title: "Build Inspector",
	description:
		"Paste a DIM build link and read every perk, mod, aspect and fragment in it, with the community's hidden numbers and the effects they refer to.",
	path: "/build",
});

export default function BuildPage() {
	return (
		<main className="flex-1">
			{/* Outside the Suspense boundary on purpose: the inspector reads the URL
			    through nuqs, so it only renders client side, and without this the
			    prerendered page has no heading or text at all. */}
			<header className="px-4 pt-4 md:px-6 lg:px-8">
				<h1 className="font-display text-2xl font-black text-white uppercase lg:text-3xl">
					Build Inspector
				</h1>
				<p className="mt-1 max-w-3xl text-sm leading-6 text-white/72">
					Paste a DIM build link to read every perk, mod, aspect and fragment in
					it, with the community&apos;s hidden numbers, plus the effects those
					descriptions refer to.
				</p>
			</header>
			<Suspense fallback={null}>
				<BuildInspector />
			</Suspense>
		</main>
	);
}
