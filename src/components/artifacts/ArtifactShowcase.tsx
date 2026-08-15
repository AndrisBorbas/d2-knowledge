"use client";

import Image from "next/image";

import type { Artifact } from "@/lib/compendium/artifacts";
import { cn } from "@/lib/utils/utils";

type ArtifactShowcaseProps = {
	artifacts: Artifact[];
	selected: Artifact;
	onSelect: (slug: string) => void;
};

export function ArtifactShowcase({
	artifacts,
	selected,
	onSelect,
}: ArtifactShowcaseProps) {
	return (
		<div className="flex flex-col gap-4">
			<div
				className="flex flex-col gap-2"
				role="group"
				aria-label="Select artifact"
			>
				{artifacts.map((artifact) => {
					const isActive = artifact.slug === selected.slug;

					return (
						<button
							key={artifact.slug}
							type="button"
							onClick={() => onSelect(artifact.slug)}
							aria-pressed={isActive}
							className={cn(
								"borderHover flex items-center gap-3 px-3 py-2 text-left backdrop-blur-md transition",
								isActive
									? "borderActive bg-blue-500/30"
									: "bg-blue-500/10 hover:bg-blue-500/20",
							)}
						>
							{artifact.iconPath ? (
								<Image
									src={artifact.iconPath}
									alt=""
									width={64}
									height={64}
									className="size-16 shrink-0 border border-white/20 object-cover"
								/>
							) : (
								<span className="size-16 shrink-0 border border-dashed border-white/20" />
							)}
							<span className="max-w-[60vw] min-w-0">
								<span
									className={cn(
										"block truncate text-base font-semibold",
										isActive ? "text-sky-100" : "text-white/80",
									)}
								>
									{artifact.name}
								</span>
								{artifact.releaseLabel ? (
									<span className="block truncate text-sm tracking-[0.16em] text-white/45 uppercase">
										{artifact.releaseLabel}
									</span>
								) : null}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
