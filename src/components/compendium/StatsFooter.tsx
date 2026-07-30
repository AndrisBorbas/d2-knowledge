"use client";

type StatsFooterProps = {
	activeGroupCount: number;
	curatedGroupCount: number;
	visibleEntryCount: number;
	totalEntryCount: number;
	keywordCount: number;
	annotationCount: number;
	generatedAt: string;
};

export function StatsFooter({
	activeGroupCount,
	curatedGroupCount,
	visibleEntryCount,
	totalEntryCount,
	keywordCount,
	annotationCount,
	generatedAt,
}: StatsFooterProps) {
	return (
		<footer className="p-4 backdrop-blur-md md:px-6 lg:px-8">
			<h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
				Destiny 2 Knowledge
			</h1>
			<div className="mt-6 grid gap-3 md:grid-cols-4">
				<div className="borderHover bg-white/6 p-4">
					<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
						Groups
					</div>
					<div className="mt-2 text-2xl font-semibold text-white">
						{activeGroupCount}/{curatedGroupCount}
					</div>
				</div>
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

			<p className="mt-4 text-xs text-white/45">
				Generated {new Date(generatedAt).toLocaleString("de-DE")}
			</p>
		</footer>
	);
}
