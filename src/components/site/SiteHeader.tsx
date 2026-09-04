"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button, IconActionButton } from "@/components/ui/Button";
import { NAV_SITE_PAGES } from "@/lib/site/sections";
import { cn } from "@/lib/utils/utils";

import { HoverPrefetchLink } from "./HoverPrefetchLink";
import { SettingsDialog } from "./SettingsDialog";

export function SiteHeader() {
	const [isNavbarOpen, setNavbarOpen] = useState(false);
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-30 border-b border-blue-500/50 backdrop-blur-sm">
			<nav className="flex w-full flex-auto flex-col items-center gap-3 p-2 lg:flex-row">
				<div className="flex w-full flex-auto justify-between lg:w-[revert-layer] lg:flex-none">
					<Button
						asChild
						variant="subtle"
						size="none"
						className=""
						// active={pathname === "/"}
					>
						<Link
							href="/"
							aria-current={pathname === "/" ? "page" : undefined}
							className="flex items-center gap-2 px-3 py-1.5"
						>
							<Image
								src="/assets/icons/owlsector.svg"
								alt="Owl Sector logo"
								width={24}
								height={24}
							/>
							<span className="text-masterwork text-shadow-masterwork/60 text-base font-semibold text-nowrap text-shadow-[0px_0px_7px]">
								Owl Sector
							</span>
						</Link>
					</Button>

					<IconActionButton
						icon={Menu}
						iconSize={20}
						className="block h-full cursor-pointer rounded border border-solid border-transparent bg-transparent px-2 py-2 text-xl leading-none outline-none focus:outline-none lg:hidden"
						onClick={setNavbarOpen.bind(null, (prev) => !prev)}
						label="Navbar toggler"
					/>
				</div>

				<div
					className={cn(
						"pointer-events-none z-50 flex max-h-0 w-full transform flex-col items-center gap-4 overflow-hidden opacity-0 transition-[max-height,opacity,transform] duration-300 ease-in-out lg:pointer-events-auto lg:max-h-none lg:flex-auto lg:transform-none lg:flex-row lg:gap-2 lg:overflow-visible lg:opacity-100",
						isNavbarOpen
							? "pointer-events-auto max-h-120 translate-y-0 opacity-100"
							: "",
					)}
				>
					{NAV_SITE_PAGES.map((section) => {
						const isActive = pathname.startsWith(section.href);

						return (
							<Button
								key={section.slug}
								asChild
								variant="subtle"
								active={isActive}
								className="w-full lg:w-auto"
								onClick={setNavbarOpen.bind(null, false)}
							>
								<HoverPrefetchLink
									href={section.href}
									aria-current={isActive ? "page" : undefined}
								>
									{section.title}
								</HoverPrefetchLink>
							</Button>
						);
					})}
					<div className="ml-auto flex items-center">
						<SettingsDialog />
					</div>
				</div>
			</nav>
		</header>
	);
}
