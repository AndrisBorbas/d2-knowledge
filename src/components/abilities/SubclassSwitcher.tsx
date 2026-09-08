"use client";

import Image from "next/image";

import { HoverPrefetchLink } from "@/components/site/HoverPrefetchLink";
import type { Subclass } from "@/lib/compendium/subclasses";
import { CLASS_SLUGS, ELEMENT_SLUGS } from "@/lib/compendium/subclasses";
import { cn } from "@/lib/utils/utils";

import { ELEMENT_ACTIVE_CLASS, ELEMENT_TEXT_CLASS } from "./elementStyles";

type SubclassSwitcherProps = {
	subclasses: Subclass[];
	selected: Subclass;
};

// The game hides the other subclasses behind a hover carousel. Here both axes
// are always on screen: pick a class, pick an element.
export function SubclassSwitcher({
	subclasses,
	selected,
}: SubclassSwitcherProps) {
	const byKey = new Map(
		subclasses.map((subclass) => [
			`${subclass.classSlug}|${subclass.elementSlug}`,
			subclass,
		]),
	);

	return (
		<div className="flex flex-col gap-3">
			<div
				className="flex flex-wrap gap-2"
				role="group"
				aria-label="Select class"
			>
				{CLASS_SLUGS.map((classSlug) => {
					const target = byKey.get(`${classSlug}|${selected.elementSlug}`);
					if (!target) return null;
					const isActive = classSlug === selected.classSlug;

					return (
						<HoverPrefetchLink
							key={classSlug}
							href={`/abilities/${classSlug}/${selected.elementSlug}`}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"borderHover px-4 py-2 text-sm font-semibold tracking-[0.16em] uppercase backdrop-blur-md transition",
								isActive
									? "borderActive bg-white/20 text-white"
									: "bg-white/5 text-white/65 hover:bg-white/12",
							)}
						>
							{target.className}
						</HoverPrefetchLink>
					);
				})}
			</div>

			<div
				className="flex flex-wrap gap-2"
				role="group"
				aria-label="Select subclass"
			>
				{ELEMENT_SLUGS.map((elementSlug) => {
					const target = byKey.get(`${selected.classSlug}|${elementSlug}`);
					if (!target) return null;
					const isActive = elementSlug === selected.elementSlug;

					return (
						<HoverPrefetchLink
							key={elementSlug}
							href={`/abilities/${selected.classSlug}/${elementSlug}`}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"borderHover flex items-center gap-2 px-3 py-2 text-sm font-semibold backdrop-blur-md transition",
								isActive
									? cn("borderActive", ELEMENT_ACTIVE_CLASS[elementSlug])
									: cn(
											"bg-white/5 hover:bg-white/12",
											ELEMENT_TEXT_CLASS[elementSlug],
										),
							)}
						>
							{target.iconPath ? (
								<Image
									src={target.iconPath}
									alt=""
									width={28}
									height={28}
									className="size-7 object-contain"
								/>
							) : null}
							<span className="tracking-[0.14em] uppercase">
								{target.element}
							</span>
						</HoverPrefetchLink>
					);
				})}
			</div>
		</div>
	);
}
