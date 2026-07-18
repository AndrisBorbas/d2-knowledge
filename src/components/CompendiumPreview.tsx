"use client";

import { useState } from "react";

import type { CompendiumDataset } from "@/lib/sheet/model";

import { TextWithTooltips } from "./Tooltip";

type CompendiumPreviewProps = {
	dataset: CompendiumDataset;
};

export function CompendiumPreview({ dataset }: CompendiumPreviewProps) {
	const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
	const keywordById = new Map(
		dataset.keywords.map((keyword) => [keyword.id, keyword]),
	);
	const allEntries = dataset.tabs.flatMap((tab) => tab.entries);
	const totalAnnotations = allEntries.reduce(
		(count, entry) => count + entry.annotations.length,
		0,
	);
	const activeKeyword = activeKeywordId
		? (keywordById.get(activeKeywordId) ?? null)
		: null;

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 text-sm md:px-8 lg:px-10">
			<header className="rounded-3xl border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
				<p className="text-xs font-semibold tracking-[0.3em] text-white/60 uppercase">
					Parsed Data Preview
				</p>
				<h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
					Compendium dataset at a glance
				</h1>
				<p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
					This view renders the normalized entries, matched keyword annotations,
					and source coordinates directly from the current parser output.
				</p>
				<div className="mt-6 grid gap-3 md:grid-cols-4">
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Tabs
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{dataset.tabs.length}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Entries
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{allEntries.length}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Keywords
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{dataset.keywords.length}
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							Annotations
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{totalAnnotations}
						</div>
					</div>
				</div>
				<p className="mt-4 text-xs text-white/45">
					Generated {new Date(dataset.generatedAt).toLocaleString()}
				</p>
			</header>

			<div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
				<aside className="xl:sticky xl:top-6 xl:self-start">
					<div className="rounded-3xl border border-white/12 bg-black/45 p-5 shadow-2xl shadow-black/20 backdrop-blur-md">
						<p className="text-xs font-semibold tracking-[0.25em] text-white/55 uppercase">
							Keyword Inspector
						</p>
						{activeKeyword ? (
							<div className="mt-4 space-y-4">
								<div>
									<h2 className="text-xl font-semibold text-white">
										{activeKeyword.label}
									</h2>
									<p className="mt-1 text-xs tracking-[0.18em] text-white/45 uppercase">
										{activeKeyword.variant} keyword
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{activeKeyword.aliases.length > 0 ? (
										activeKeyword.aliases.map((alias) => (
											<span
												key={alias}
												className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/72"
											>
												{alias}
											</span>
										))
									) : (
										<span className="text-sm text-white/55">No aliases</span>
									)}
								</div>
								<p className="text-sm leading-6 text-white/68">
									Referenced by {activeKeyword.references.length} entr
									{activeKeyword.references.length === 1 ? "y" : "ies"}.
								</p>
							</div>
						) : (
							<p className="mt-4 text-sm leading-7 text-white/62">
								Hover or click any highlighted term below to inspect the matched
								keyword.
							</p>
						)}
					</div>
				</aside>

				<div className="space-y-5">
					{dataset.tabs.map((tab) => (
						<details
							key={tab.name}
							open
							className="rounded-3xl border border-white/12 bg-black/45 p-5 shadow-2xl shadow-black/20 backdrop-blur-md"
						>
							<summary className="cursor-pointer list-none text-lg font-semibold text-white">
								<div className="flex flex-wrap items-center gap-3">
									<span>{tab.name}</span>
									<span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/65">
										{tab.entries.length} entries
									</span>
								</div>
							</summary>
							<div className="mt-5 grid gap-4 lg:grid-cols-2">
								{tab.entries.map((entry) => {
									const uniqueAnnotationIds = [
										...new Set(entry.annotations.map((item) => item.keywordId)),
									];

									return (
										<article
											key={entry.id}
											className="rounded-2xl border border-white/10 bg-white/6 p-4"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<p className="text-xs tracking-[0.18em] text-white/45 uppercase">
														{entry.section ?? "Unsectioned"}
													</p>
													<h3 className="mt-2 text-xl font-semibold text-white">
														{entry.title}
													</h3>
												</div>
												<span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/65">
													r{entry.source.row + 1} c{entry.source.column + 1}
												</span>
											</div>

											<p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-white/80">
												<TextWithTooltips
													text={entry.description}
													annotations={entry.annotations}
													keywordById={keywordById}
													onKeywordHover={setActiveKeywordId}
													onKeywordLeave={() => setActiveKeywordId(null)}
													onKeywordClick={setActiveKeywordId}
												/>
											</p>

											{entry.extraInfo ? (
												<p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-white/60">
													{entry.extraInfo}
												</p>
											) : null}

											<div className="mt-4 flex flex-wrap gap-2">
												{uniqueAnnotationIds.length > 0 ? (
													uniqueAnnotationIds.map((keywordId) => {
														const keyword = keywordById.get(keywordId);
														if (!keyword) return null;

														return (
															<button
																key={keyword.id}
																type="button"
																onClick={() => setActiveKeywordId(keyword.id)}
																className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/72 transition hover:bg-white/14"
															>
																{keyword.label}
															</button>
														);
													})
												) : (
													<span className="text-xs text-white/45">
														No keyword matches
													</span>
												)}
											</div>
										</article>
									);
								})}
							</div>
						</details>
					))}
				</div>
			</div>
		</div>
	);
}
