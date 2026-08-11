"use client";

import manifest from "@/../package.json";

type StatsFooterProps = {
	visibleEntryCount: number;
	totalEntryCount: number;
	keywordCount: number;
	annotationCount: number;
	generatedAt: string;
};

export function StatsFooter({
	visibleEntryCount,
	totalEntryCount,
	keywordCount,
	annotationCount,
	generatedAt,
}: StatsFooterProps) {
	return (
		<footer className="p-4 backdrop-blur-md md:px-6 lg:px-8">
			<h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
				Owl Sector
			</h1>
			<div className="mt-6 grid gap-3 md:grid-cols-3">
				<div className="borderHover bg-white/6 p-4">
					<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
						Entries
					</div>
					<div className="mt-2 text-2xl font-semibold text-white">
						{visibleEntryCount}/{totalEntryCount}
					</div>
				</div>
				<div className="borderHover bg-white/6 p-4">
					<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
						Keywords
					</div>
					<div className="mt-2 text-2xl font-semibold text-white">
						{keywordCount}
					</div>
				</div>
				<div className="borderHover bg-white/6 p-4">
					<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
						Annotations
					</div>
					<div className="mt-2 text-2xl font-semibold text-white">
						{annotationCount}
					</div>
				</div>
			</div>

			<div className="borderHover mt-6 space-y-2 bg-white/6 p-4 text-xs text-white/60">
				<p>
					Sandbox data from the{" "}
					<a
						href="https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4/edit"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
					>
						Data Compendium
					</a>{" "}
					sheet, support them on{" "}
					<a
						href="https://www.patreon.com/DataCompendium?utm_source=d2-knowledge"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
					>
						Patreon
					</a>
					.
				</p>
				<p>
					Perk data from{" "}
					<a
						href="https://d2clarity.com?utm_source=d2-knowledge"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
					>
						Clarity
					</a>
					. Tooltip feedback goes to their{" "}
					<a
						href="https://d2clarity.com/discord?utm_source=d2-knowledge"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
					>
						Discord
					</a>
					, support on{" "}
					<a
						href="https://url.d2clarity.com/ko-fi?utm_source=d2-knowledge"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
					>
						Ko-fi
					</a>
					.
				</p>
			</div>

			<div className="mt-8 flex items-center justify-center gap-16 text-xs text-white/60">
				<a
					href="https://www.github.com/AndrisBorbas/d2-knowledge"
					target="_blank"
					rel="noopener noreferrer"
					className="underline hover:text-white"
				>
					<div className="text-masterwork size-8">
						<svg
							role="img"
							viewBox="0 0 24 24"
							fill="currentColor"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>GitHub</title>
							<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
						</svg>
					</div>
				</a>
				<a
					href="https://ko-fi.com/andrisborbas?utm_source=d2-knowledge"
					target="_blank"
					rel="noopener noreferrer"
					className="underline hover:text-white"
				>
					<div className="text-masterwork size-8">
						<svg
							role="img"
							viewBox="0 0 24 24"
							fill="currentColor"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Ko-fi</title>
							<path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298" />
						</svg>
					</div>
				</a>
			</div>

			<div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<p className="text-xs text-white/45">
					Destiny is a registered trademark of Bungie. Some content and images
					are the property of Bungie.
				</p>
				<p className="mt-2 text-xs text-white/45">
					<a
						href="https://www.github.com/AndrisBorbas/d2-knowledge"
						target="_blank"
						rel="noopener noreferrer"
						className="decoration-masterwork hover:underline"
					>
						Data last refreshed on{" "}
						{new Date(generatedAt).toLocaleString("de-DE")} · v
						{manifest.version} © {new Date().getFullYear()} AndrisBorbas
					</a>
				</p>
			</div>
		</footer>
	);
}
