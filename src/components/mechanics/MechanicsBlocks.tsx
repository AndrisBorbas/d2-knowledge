import Image from "next/image";
import { Fragment } from "react";

import type {
	MechanicsBlock,
	MechanicsEntry,
	MechanicsTable,
	RichText,
} from "@/lib/ddc/mechanics";
import { cn } from "@/lib/utils/utils";

// Cuts rich text wherever the plain text holds `separator`, keeping each run's
// color on both sides of the cut.
function splitRichText(text: RichText, separator: RegExp): RichText[] {
	const parts: RichText[] = [[]];
	for (const run of text) {
		const pieces = run.text.split(separator);
		pieces.forEach((piece, index) => {
			if (index > 0) parts.push([]);
			if (piece) parts.at(-1)!.push({ text: piece, color: run.color });
		});
	}
	return parts.filter((part) => part.some((run) => run.text.trim()));
}

// One paragraph: the sheet's colors, and its single line breaks kept.
function RichLine({ text }: { text: RichText }) {
	return (
		<>
			{text.map((run, runIndex) => {
				const lines = run.text.split("\n");
				const content = lines.map((line, lineIndex) => (
					<Fragment key={lineIndex}>
						{lineIndex > 0 ? <br /> : null}
						{line}
					</Fragment>
				));
				return run.color ? (
					<span key={runIndex} style={{ color: run.color }}>
						{content}
					</span>
				) : (
					<Fragment key={runIndex}>{content}</Fragment>
				);
			})}
		</>
	);
}

function RichParagraphs({ text }: { text: RichText }) {
	return (
		<div className="flex flex-col gap-3">
			{splitRichText(text, /\n{2,}/).map((paragraph, index) => (
				<p key={index}>
					<RichLine text={paragraph} />
				</p>
			))}
		</div>
	);
}

// The sheet's ▲ / ▼ marks: how far a modifier raises or lowers the challenge
// score.
function DifficultyMark({ value }: { value: string }) {
	const raises = value.includes("▲");
	const label = `${raises ? "Raises" : "Lowers"} the challenge score by ${value.length}`;
	return (
		<span
			title={label}
			aria-label={label}
			className={cn(
				"shrink-0 px-1.5 py-0.5 text-[10px] leading-none tracking-[0.1em]",
				raises
					? "bg-red-500/15 text-red-300"
					: "bg-emerald-500/15 text-emerald-200",
			)}
		>
			{value}
		</span>
	);
}

function EntryList({ entries }: { entries: MechanicsEntry[] }) {
	return (
		<dl className="flex flex-col">
			{entries.map((entry, index) => (
				<div
					key={`${entry.name}-${index}`}
					className="grid gap-x-6 gap-y-1.5 border-t border-white/10 py-3 first:border-t-0 md:grid-cols-[13rem_1fr]"
				>
					<dt className="flex flex-col gap-1">
						<span className="flex flex-wrap items-center gap-2 font-semibold text-white">
							{entry.iconPath ? (
								<Image
									src={entry.iconPath}
									alt=""
									width={28}
									height={28}
									className="size-7 shrink-0 object-contain"
								/>
							) : null}
							{entry.name}
							{entry.difficulty ? (
								<DifficultyMark value={entry.difficulty} />
							) : null}
						</span>
						{entry.note ? (
							<span className="text-xs text-white/50">{entry.note}</span>
						) : null}
					</dt>
					<dd className="text-white/72">
						<RichParagraphs text={entry.description} />
					</dd>
				</div>
			))}
		</dl>
	);
}

function Table({ table }: { table: MechanicsTable }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left text-[13px] leading-5">
				{table.headerRows.length > 0 ? (
					<thead>
						{table.headerRows.map((row, rowIndex) => (
							<tr key={rowIndex}>
								{row.map((cell, cellIndex) => (
									<th
										key={cellIndex}
										scope="col"
										colSpan={cell.colSpan}
										rowSpan={cell.rowSpan}
										className="border border-white/10 bg-white/6 px-2.5 py-1.5 align-bottom font-semibold text-white"
									>
										<RichLine text={cell.text} />
									</th>
								))}
							</tr>
						))}
					</thead>
				) : null}
				<tbody>
					{table.bodyRows.map((row, rowIndex) => (
						<tr key={rowIndex} className="even:bg-white/2">
							{row.map((cell, cellIndex) => (
								<td
									key={cellIndex}
									colSpan={cell.colSpan}
									rowSpan={cell.rowSpan}
									className={cn(
										"border border-white/10 px-2.5 py-1.5 align-top text-white/72",
										cellIndex === 0 && !cell.isEmpty
											? "font-medium text-white"
											: "",
									)}
								>
									<RichLine text={cell.text} />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function MechanicsBlocks({ blocks }: { blocks: MechanicsBlock[] }) {
	return (
		<div className="flex flex-col gap-5 text-sm leading-7">
			{blocks.map((block, index) => {
				switch (block.kind) {
					case "heading":
						return (
							<header
								key={block.id}
								id={block.id}
								className="mt-3 scroll-mt-20 first:mt-0"
							>
								<h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
									<a
										href={`#${block.id}`}
										className="hover:text-masterwork transition-colors"
									>
										{block.title}
									</a>
									{block.difficulty ? (
										<DifficultyMark value={block.difficulty} />
									) : null}
								</h3>
								{block.subtitle ? (
									<p className="text-sm leading-6 text-white/55">
										{block.subtitle}
									</p>
								) : null}
							</header>
						);
					case "prose":
						return (
							<div
								key={index}
								className={cn(
									"grid gap-5 text-white/72",
									block.columns.length > 1 ? "md:grid-cols-2" : "",
								)}
							>
								{block.columns.map((column, columnIndex) => (
									<RichParagraphs key={columnIndex} text={column} />
								))}
							</div>
						);
					case "entries":
						return <EntryList key={index} entries={block.entries} />;
					case "table":
						return <Table key={index} table={block.table} />;
				}
			})}
		</div>
	);
}
