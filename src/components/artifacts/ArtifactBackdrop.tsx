"use client";

import Image from "next/image";

import type { Artifact } from "@/lib/compendium/artifacts";

type ArtifactBackdropProps = {
	artifact: Artifact;
};

// In game the artifact art sits behind the whole screen, bleeding off the right
// edge and fading out under the perk panel. This layer sits above the site
// background (also -z-1, but earlier in the DOM) and below the page content.
export function ArtifactBackdrop({ artifact }: ArtifactBackdropProps) {
	if (!artifact.artPath) return null;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-1 overflow-hidden"
		>
			<div className="absolute inset-y-2 right-2 w-full lg:inset-y-8 lg:right-8 lg:w-[66%]">
				<Image
					src={artifact.artPath}
					alt=""
					fill
					priority
					sizes="100vw"
					className="object-contain object-center opacity-35 lg:opacity-70"
				/>
				{/* Fade into the page background on the side the UI sits on. */}
				{/* <div className="from-background via-background/70 absolute inset-0 bg-gradient-to-r to-transparent lg:via-transparent" /> */}
				{/* <div className="from-background absolute inset-0 bg-gradient-to-t to-transparent" /> */}
			</div>
		</div>
	);
}
