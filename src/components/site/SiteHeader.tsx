"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LIVE_SITE_SECTIONS } from "@/lib/site/sections";
import { cn } from "@/lib/utils/utils";

export function SiteHeader() {
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-30 border-b border-blue-500/50 backdrop-blur-sm">
			<nav className="flex flex-wrap items-center gap-3 p-2">
				<Link
					href="/"
					aria-current={pathname === "/" ? "page" : undefined}
					className={cn(
						"borderHover flex items-center gap-2 px-3 py-1.5 transition",
						pathname === "/"
							? "bg-blue-500/30"
							: "bg-blue-500/10 hover:bg-blue-500/20",
					)}
				>
					<Image
						src="/assets/icons/owlsector.svg"
						alt="Owl Sector logo"
						width={24}
						height={24}
					/>
					<span className="text-masterwork text-shadow-masterwork/60 text-base font-semibold text-shadow-[0px_0px_7px]">
						Owl Sector
					</span>
				</Link>

				<div className="flex flex-wrap gap-2">
					{LIVE_SITE_SECTIONS.map((section) => {
						const isActive = pathname.startsWith(section.href);

						return (
							<Link
								key={section.slug}
								href={section.href}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"borderHover px-3 py-1.5 text-xs font-semibold tracking-[0.08em] uppercase transition",
									isActive
										? "borderActive bg-blue-500/30 text-sky-100"
										: "bg-blue-500/10 text-white/68 hover:bg-blue-500/20",
								)}
							>
								{section.title}
							</Link>
						);
					})}
				</div>
			</nav>
		</header>
	);
}
