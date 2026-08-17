import Link from "next/link";

import { SITE_SECTIONS } from "@/lib/site/sections";

export function SectionCards() {
	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-xs font-semibold tracking-[0.2em] text-white/62 uppercase">
				Sections
			</h2>

			<div className="grid gap-3 text-white md:grid-cols-2 xl:grid-cols-3">
				{SITE_SECTIONS.map((section) => {
					const body = (
						<>
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-xl font-semibold">{section.title}</h3>
								{section.status === "planned" ? (
									<span className="border border-white/20 px-2 py-0.5 text-[10px] tracking-[0.16em] opacity-90">
										Coming soon
									</span>
								) : null}
							</div>
							<p className="mt-2 text-sm leading-6 opacity-70">
								{section.description}
							</p>
						</>
					);

					if (section.status !== "live") {
						return (
							<div
								key={section.slug}
								aria-disabled="true"
								className="border border-dashed border-white/10 bg-white/4 p-4 text-white/70 backdrop-blur-xs"
							>
								{body}
							</div>
						);
					}

					return (
						<Link
							key={section.slug}
							href={section.href}
							className="borderHover bg-blue-950/20 p-4 backdrop-blur-md transition hover:bg-blue-950/40"
						>
							{body}
						</Link>
					);
				})}
			</div>
		</section>
	);
}
