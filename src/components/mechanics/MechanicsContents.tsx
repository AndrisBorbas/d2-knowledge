"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/utils";

export type ContentsChapter = {
	id: string;
	title: string;
	headings: { id: string; title: string }[];
};

// How far below the viewport top a heading has to pass before it counts as
// the one being read. Clears the sticky site header with some room to spare.
const READING_LINE = 120;

export function MechanicsContents({
	chapters,
}: {
	chapters: ContentsChapter[];
}) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const listRef = useRef<HTMLOListElement>(null);

	useEffect(() => {
		const ids = chapters.flatMap((chapter) => [
			chapter.id,
			...chapter.headings.map((heading) => heading.id),
		]);
		const targets = ids
			.map((id) => document.getElementById(id))
			.filter((element): element is HTMLElement => element !== null);

		let frame = 0;
		const update = () => {
			frame = 0;
			// The last heading above the reading line, in page order. At the very
			// bottom of the page the last heading wins even if it never reaches
			// the line, or a short final section could never be highlighted.
			const atBottom =
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - 2;
			let current: HTMLElement | undefined = targets[0];
			for (const target of targets) {
				if (target.getBoundingClientRect().top > READING_LINE) break;
				current = target;
			}
			if (atBottom) current = targets.at(-1);
			setActiveId(current?.id ?? null);
		};

		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		update();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		return () => {
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [chapters]);

	// Keeps the highlighted link visible when the aside scrolls on its own. It
	// only moves the aside: `scrollIntoView` would drag the page along too.
	useEffect(() => {
		if (!activeId) return;
		const link = listRef.current?.querySelector<HTMLElement>(
			`[data-target="${CSS.escape(activeId)}"]`,
		);
		const container = listRef.current?.closest("aside");
		if (!link || !container) return;
		if (container.scrollHeight <= container.clientHeight) return;

		const linkRect = link.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		const margin = 48;
		if (linkRect.top < containerRect.top + margin) {
			container.scrollTop -= containerRect.top + margin - linkRect.top;
		} else if (linkRect.bottom > containerRect.bottom - margin) {
			container.scrollTop += linkRect.bottom - (containerRect.bottom - margin);
		}
	}, [activeId]);

	const activeChapterId = chapters.find(
		(chapter) =>
			chapter.id === activeId ||
			chapter.headings.some((heading) => heading.id === activeId),
	)?.id;

	return (
		<nav aria-label="Contents" className="text-sm">
			<p className="text-xs font-semibold tracking-[0.2em] text-white/45 uppercase">
				Contents
			</p>
			<ol ref={listRef} className="mt-3 flex flex-col gap-2">
				{chapters.map((chapter) => {
					const isChapterActive = chapter.id === activeChapterId;
					return (
						<li key={chapter.id}>
							<a
								href={`#${chapter.id}`}
								data-target={chapter.id}
								aria-current={chapter.id === activeId ? "location" : undefined}
								className={cn(
									"hover:text-masterwork font-medium transition-colors",
									isChapterActive ? "text-masterwork" : "text-white/85",
								)}
							>
								{chapter.title}
							</a>
							{chapter.headings.length > 0 ? (
								<ol
									className={cn(
										"mt-1 flex flex-col gap-0.5 border-l pl-3 transition-colors",
										isChapterActive
											? "border-masterwork/40"
											: "border-white/10",
									)}
								>
									{chapter.headings.map((heading) => {
										const isActive = heading.id === activeId;
										return (
											<li key={heading.id} className="relative">
												{isActive ? (
													<span
														aria-hidden
														className="bg-masterwork absolute top-0 bottom-0 -left-[13px] w-0.5"
													/>
												) : null}
												<a
													href={`#${heading.id}`}
													data-target={heading.id}
													aria-current={isActive ? "location" : undefined}
													className={cn(
														"hover:text-masterwork text-[13px] leading-5 transition-colors",
														isActive ? "text-white" : "text-white/50",
													)}
												>
													{heading.title}
												</a>
											</li>
										);
									})}
								</ol>
							) : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
