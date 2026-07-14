import { cache, createAsync } from "@solidjs/router";
import {
	For,
	Show,
	Suspense,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	type VoidComponent,
} from "solid-js";
import { buildCompendiumDataset } from "~/lib/sheet/compendium";
import type {
	Annotation,
	CompendiumDataset,
	Entry,
	Keyword,
	KeywordCategory,
} from "~/lib/sheet/model";
import { cn } from "~/lib/utils";

const getCompendiumData = cache(async (): Promise<CompendiumDataset> => {
	"use server";
	return buildCompendiumDataset();
}, "compendium-dataset-v1");

interface AnnotatedTextProps {
	text: string;
	annotations: Annotation[];
	keywordById: Map<string, Keyword>;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (keywordId: string) => void;
}

function categoryClass(category: KeywordCategory) {
	if (category === "element")
		return "bg-[var(--color-element-soft)] text-[var(--color-element)]";
	if (category === "weapon")
		return "bg-[var(--color-weapon-soft)] text-[var(--color-weapon)]";
	if (category === "status")
		return "bg-[var(--color-status-soft)] text-[var(--color-status)]";
	return "bg-[var(--color-misc-soft)] text-[var(--color-misc)]";
}

const KEYWORD_CHIP_BASE =
	"inline cursor-pointer rounded border-0 bg-transparent px-[0.12rem] py-0 font-bold [font:inherit] leading-[inherit] transition duration-100 hover:-translate-y-px hover:saturate-125";

const TAB_BASE =
	"cursor-pointer rounded-full border px-3 py-2 text-[0.83rem] font-bold whitespace-nowrap transition duration-100 hover:-translate-y-px";

function tabClass(isActive: boolean) {
	return cn(
		TAB_BASE,
		isActive
			? "border-transparent bg-(--bg-tab-active) text-(--color-tab-active-text)"
			: "border-(--color-tab-border) bg-white/80 text-(--color-slate) hover:border-(--color-tab-border-hover)",
	);
}

function AnnotatedText(props: AnnotatedTextProps) {
	const segments = createMemo(() => {
		const sorted = [...props.annotations]
			.filter((item) => item.end > item.start && item.start >= 0)
			.sort((a, b) => a.start - b.start);

		const nodes: JSX.Element[] = [];
		let cursor = 0;

		for (const annotation of sorted) {
			if (annotation.start > cursor) {
				nodes.push(props.text.slice(cursor, annotation.start));
			}

			const keyword = props.keywordById.get(annotation.keywordId);
			if (!keyword) {
				nodes.push(props.text.slice(annotation.start, annotation.end));
				cursor = annotation.end;
				continue;
			}

			nodes.push(
				<button
					type="button"
					class={cn(KEYWORD_CHIP_BASE, categoryClass(keyword.category))}
					onMouseEnter={() => props.onKeywordHover?.(keyword.id)}
					onMouseLeave={() => props.onKeywordLeave?.()}
					onClick={() => props.onKeywordClick?.(keyword.id)}
					title={`Open ${keyword.label}`}
				>
					{props.text.slice(annotation.start, annotation.end)}
				</button>,
			);

			cursor = annotation.end;
		}

		if (cursor < props.text.length) {
			nodes.push(props.text.slice(cursor));
		}

		return nodes;
	});

	return <>{segments()}</>;
}

interface KeywordPanelProps {
	keywordId: string;
	label: string;
	keywordById: Map<string, Keyword>;
	entryById: Map<string, Entry>;
	onKeywordHover: (keywordId: string) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (keywordId: string) => void;
	onRemove?: () => void;
}

function KeywordPanel(props: KeywordPanelProps) {
	const keyword = createMemo(() => props.keywordById.get(props.keywordId));

	const entries = createMemo(() => {
		const current = keyword();
		if (!current) return [] as Entry[];
		return current.references
			.map((id) => props.entryById.get(id))
			.filter((item): item is Entry => Boolean(item))
			.slice(0, 6);
	});

	const relatedKeywords = createMemo(() => {
		const current = keyword();
		if (!current) return [] as Keyword[];

		const counts = new Map<string, number>();
		for (const entry of entries()) {
			for (const annotation of entry.annotations) {
				if (annotation.keywordId === current.id) continue;
				counts.set(
					annotation.keywordId,
					(counts.get(annotation.keywordId) ?? 0) + 1,
				);
			}
		}

		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([keywordId]) => props.keywordById.get(keywordId))
			.filter((item): item is Keyword => Boolean(item))
			.slice(0, 8);
	});

	return (
		<div class="grid gap-2.5 rounded-[14px] border border-(--color-ink-soft) bg-white/90 p-3 shadow-(--shadow-panel) backdrop-blur-[3px]">
			<div class="flex justify-between gap-2">
				<div>
					<div class="text-[0.68rem] font-bold tracking-[0.08em] text-(--color-slate) uppercase">
						{props.label}
					</div>
					<div class="text-[1.03rem] font-extrabold text-(--color-ink)">
						{keyword()?.label ?? props.keywordId}
					</div>
				</div>
				<Show when={props.onRemove}>
					<button
						type="button"
						class="cursor-pointer rounded-lg border border-(--color-ink-mid) bg-white px-2 py-1 text-[0.74rem] font-bold text-(--color-ink)"
						onClick={() => props.onRemove?.()}
					>
						Close
					</button>
				</Show>
			</div>
			<div class="flex gap-2.5 text-[0.77rem] text-(--color-slate)">
				<span>{entries().length} linked entries</span>
				<span>{relatedKeywords().length} related terms</span>
			</div>

			<Show when={relatedKeywords().length > 0}>
				<div class="flex flex-wrap gap-1.5">
					<For each={relatedKeywords()}>
						{(item) => (
							<button
								type="button"
								class={cn(KEYWORD_CHIP_BASE, categoryClass(item.category))}
								onMouseEnter={() => props.onKeywordHover(item.id)}
								onMouseLeave={() => props.onKeywordLeave()}
								onClick={() => props.onKeywordClick(item.id)}
							>
								{item.label}
							</button>
						)}
					</For>
				</div>
			</Show>

			<div class="grid gap-2">
				<For each={entries()}>
					{(entry) => (
						<article class="rounded-[10px] border border-(--color-ink-faint) bg-white/80 p-2.5">
							<h4 class="m-0 text-[0.84rem] font-bold text-(--color-slate-strong)">
								{entry.title}
							</h4>
							<p class="m-0 mt-1.5 text-[0.83rem] leading-[1.43] text-(--color-slate-body)">
								<AnnotatedText
									text={entry.description}
									annotations={entry.annotations}
									keywordById={props.keywordById}
									onKeywordHover={props.onKeywordHover}
									onKeywordLeave={props.onKeywordLeave}
									onKeywordClick={props.onKeywordClick}
								/>
							</p>
						</article>
					)}
				</For>
			</div>
		</div>
	);
}

const Home: VoidComponent = () => {
	const dataset = createAsync(() => getCompendiumData());
	const [activeTabName, setActiveTabName] = createSignal<string>("");
	const [hoverKeywordId, setHoverKeywordId] = createSignal<string | null>(null);
	const [pinnedKeywordIds, setPinnedKeywordIds] = createSignal<string[]>([]);

	const tabs = createMemo(() => dataset()?.tabs ?? []);
	const keywords = createMemo(() => dataset()?.keywords ?? []);

	createEffect(() => {
		const firstTab = tabs()[0];
		if (firstTab && !activeTabName()) {
			setActiveTabName(firstTab.name);
		}
	});

	const activeTab = createMemo(
		() => tabs().find((tab) => tab.name === activeTabName()) ?? tabs()[0],
	);

	const keywordById = createMemo(
		() => new Map(keywords().map((keyword) => [keyword.id, keyword])),
	);

	const entryById = createMemo(() => {
		const entries = tabs().flatMap((tab) => tab.entries);
		return new Map(entries.map((entry) => [entry.id, entry]));
	});

	const pinKeyword = (keywordId: string) => {
		setPinnedKeywordIds((prev) => {
			if (prev[prev.length - 1] === keywordId) return prev;
			return [...prev, keywordId].slice(-5);
		});
	};

	const removePinAt = (index: number) => {
		setPinnedKeywordIds((prev) => prev.filter((_, idx) => idx !== index));
	};

	return (
		<main class="mx-auto grid min-h-screen max-w-[1440px] grid-rows-[auto_auto_1fr] gap-5 bg-(--bg-main) px-4 pt-5 pb-7 font-[Trebuchet_MS,Avenir_Next,Segoe_UI,sans-serif] text-(--color-ink)">
			<header class="rounded-[18px] bg-(--bg-header) px-4 pt-4 pb-3 text-(--color-header-text) shadow-(--shadow-panel)">
				<h1 class="m-0 text-[clamp(1.4rem,2vw+1rem,2.7rem)] leading-[1.1] font-extrabold">
					Destiny Data Compendium
				</h1>
				<p class="mt-2 max-w-[76ch] text-[0.98rem] text-(--color-header-text-soft)">
					Sheet-like reader with linked keyword tooltips. Hover for preview,
					click to pin, and click terms inside panels to traverse the graph.
				</p>
			</header>

			<Suspense
				fallback={
					<div class="p-5 text-base font-bold text-(--color-slate)">
						Loading compendium data...
					</div>
				}
			>
				<Show when={activeTab()}>
					<div class="flex gap-2 overflow-x-auto px-0.5 py-1">
						<For each={tabs()}>
							{(tab) => (
								<button
									type="button"
									class={tabClass(tab.name === activeTabName())}
									onClick={() => setActiveTabName(tab.name)}
								>
									{tab.name}
								</button>
							)}
						</For>
					</div>

					<div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
						<section class="overflow-hidden rounded-2xl border border-(--color-ink-soft) bg-(--bg-panel) shadow-(--shadow-panel)">
							<div class="flex items-baseline justify-between border-b border-(--color-ink-soft) bg-white/65 px-4 py-3">
								<h2 class="m-0 text-[1.2rem] font-extrabold">
									{activeTab()?.name}
								</h2>
								<span class="text-[0.85rem] text-(--color-slate)">
									{activeTab()?.entries.length ?? 0} rows parsed
								</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-[minmax(180px,0.55fr)_minmax(0,1.45fr)]">
								<div class="border-b border-(--color-ink-soft) bg-(--surface-strip) px-3 py-2 text-[0.72rem] font-bold tracking-[0.06em] text-(--color-slate) uppercase">
									Perk / Note
								</div>
								<div class="border-b border-(--color-ink-soft) bg-(--surface-strip) px-3 py-2 text-[0.72rem] font-bold tracking-[0.06em] text-(--color-slate) uppercase">
									Description
								</div>

								<For each={activeTab()?.entries ?? []}>
									{(entry) => (
										<>
											<div class="border-r-0 border-b border-(--color-ink-soft) bg-white/55 px-3 py-2.5 text-[0.92rem] leading-[1.48] md:border-r">
												<Show when={entry.section}>
													<div class="mb-1 text-[0.72rem] font-bold tracking-[0.02em] text-(--color-section)">
														{entry.section}
													</div>
												</Show>
												<div class="font-bold text-(--color-title)">
													{entry.title}
												</div>
											</div>
											<div class="border-b border-(--color-ink-soft) px-3 py-2.5 text-[0.92rem] leading-[1.48] md:pt-2.5">
												<AnnotatedText
													text={entry.description}
													annotations={entry.annotations}
													keywordById={keywordById()}
													onKeywordHover={(id) => setHoverKeywordId(id)}
													onKeywordLeave={() => setHoverKeywordId(null)}
													onKeywordClick={(id) => pinKeyword(id)}
												/>
											</div>
										</>
									)}
								</For>
							</div>
						</section>

						<aside class="grid max-h-none gap-3 overflow-auto pr-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:pr-0.5">
							<Show
								when={
									hoverKeywordId() &&
									!pinnedKeywordIds().includes(hoverKeywordId()!)
								}
							>
								<KeywordPanel
									keywordId={hoverKeywordId()!}
									label="Hover Preview"
									keywordById={keywordById()}
									entryById={entryById()}
									onKeywordHover={(id) => setHoverKeywordId(id)}
									onKeywordLeave={() => setHoverKeywordId(null)}
									onKeywordClick={pinKeyword}
								/>
							</Show>

							<For each={pinnedKeywordIds()}>
								{(keywordId, idx) => (
									<KeywordPanel
										keywordId={keywordId}
										label={`Pinned ${idx() + 1}`}
										keywordById={keywordById()}
										entryById={entryById()}
										onKeywordHover={(id) => setHoverKeywordId(id)}
										onKeywordLeave={() => setHoverKeywordId(null)}
										onKeywordClick={pinKeyword}
										onRemove={() => removePinAt(idx())}
									/>
								)}
							</For>
						</aside>
					</div>
				</Show>
			</Suspense>
		</main>
	);
};

export default Home;
