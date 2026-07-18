"use client";

import type { ReactNode } from "react";

import type { AnnotatedEntry, Annotation, Keyword } from "@/lib/sheet/model";
import { getKeywordColorFromTypes } from "@/lib/data/glossary";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { MoveUp } from "lucide-react";

const tooltipButtonVariants = cva("rounded-full", {
	variants: {
		color: {
			default:
				"bg-white/14 border-gray-300 focus:border-gray-400 active:border-gray-400",
			arc: "bg-arc/20 border-[1.5px] border-arc/50",
			solar: "bg-solar/20 border-[1.5px] border-solar/50",
			void: "bg-void/20 border-[1.5px] border-void/50",
			stasis: "bg-stasis/20 border-[1.5px] border-stasis/50",
			strand: "bg-strand/20 border-[1.5px] border-strand/50",
			prismatic: "bg-prismatic/20 border-[1.5px] border-prismatic/50",
			masterwork: "bg-masterwork/20 border-[1.5px] border-masterwork/50",
		},
		size: {
			default: "px-2 py-0 my-px text-sm",
		},
	},
	defaultVariants: {
		color: "default",
		size: "default",
	},
});

type ExtraElementProps = {
	keyword: Keyword;
} & React.ComponentPropsWithoutRef<typeof MoveUp>;

function ExtraElement({ keyword, className, ...restProps }: ExtraElementProps) {
	if (keyword.types.includes("Buff")) {
		return (
			<MoveUp
				className={cn("my-auto -ml-1 text-green-400", className)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Debuff")) {
		return (
			<MoveUp
				className={cn("my-auto -ml-1 rotate-180 text-red-400", className)}
				{...restProps}
			/>
		);
	}
	return null;
}

type TooltipButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	keyword: Keyword;
	onKeywordClick?: (keywordId: string) => void;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
} & VariantProps<typeof tooltipButtonVariants>;

function TooltipButton({
	keyword,
	onKeywordClick,
	onKeywordHover,
	onKeywordLeave,
	color,
	size,
	className,
	...restProps
}: TooltipButtonProps) {
	return (
		<button
			type="button"
			title={`Open ${keyword.label}`}
			onClick={() => onKeywordClick?.(keyword.id)}
			onMouseEnter={() => onKeywordHover?.(keyword.id)}
			onMouseLeave={onKeywordLeave}
			className={cn(
				"cursor-pointer",
				tooltipButtonVariants({
					color: color ?? getKeywordColorFromTypes(keyword.types),
					size: size,
					className: className,
				}),
			)}
			{...restProps}
		>
			<ExtraElement size={12} keyword={keyword} />
			{restProps.children ?? keyword.label}
		</button>
	);
}

type TextWithTooltipsProps = {
	text?: string;
	annotations: Annotation[];
	keywordById: Map<string, Keyword>;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (keywordId: string) => void;
};

export function TextWithTooltips(props: TextWithTooltipsProps) {
	const text = props.text ?? "";
	const sorted = [...props.annotations]
		.filter((item) => item.end > item.start && item.start >= 0)
		.sort((a, b) => a.start - b.start);

	const nodes: ReactNode[] = [];
	let cursor = 0;

	for (const annotation of sorted) {
		if (annotation.start > cursor) {
			nodes.push(text.slice(cursor, annotation.start));
		}

		const keyword = props.keywordById.get(annotation.keywordId);
		if (!keyword) {
			nodes.push(text.slice(annotation.start, annotation.end));
			cursor = annotation.end;
			continue;
		}

		nodes.push(
			<TooltipButton
				key={`${annotation.keywordId}-${annotation.start}-${annotation.end}`}
				keyword={keyword}
				onKeywordClick={props.onKeywordClick}
				onKeywordHover={props.onKeywordHover}
				onKeywordLeave={props.onKeywordLeave}
				className="inline-flex align-baseline"
				size="default"
			>
				{annotation.text}
			</TooltipButton>,
		);

		cursor = annotation.end;
	}

	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}

	return <>{nodes}</>;
}

type TooltipProps = {
	entry: AnnotatedEntry;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (keywordId: string) => void;
};

type TooltipContentProps = {
	entry: AnnotatedEntry;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (keywordId: string) => void;
};

function EntryKindBadge({ kind }: { kind: AnnotatedEntry["kind"] }) {
	const label = (kind ?? "general").replaceAll("_", " ");
	return (
		<span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/65 capitalize">
			{label}
		</span>
	);
}

function IconSlot({ iconPath, label }: { iconPath?: string; label: string }) {
	if (iconPath) {
		return (
			<img
				src={iconPath}
				alt={label}
				className="h-8 w-8 rounded-md border border-white/20 bg-black/30 object-cover"
			/>
		);
	}

	return (
		<div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-white/20 bg-black/30 text-[10px] text-white/50">
			N/A
		</div>
	);
}

function SetBonusContent({
	entry,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
				keywordById={keywordMap}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
			/>
		</p>
	);
}

function ExoticContent({
	entry,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<>
			<div className="mt-4 grid gap-2 sm:grid-cols-2">
				<div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
					<div className="flex items-center gap-2">
						<IconSlot
							iconPath={entry.secondaryIconPath}
							label={entry.secondaryName ?? "Exotic Item"}
						/>
						<div>
							<p className="text-[11px] tracking-[0.14em] text-white/45 uppercase">
								Item
							</p>
							<p className="text-sm font-medium text-white/90">
								{entry.secondaryName ?? "Unknown Item"}
							</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
					<div className="flex items-center gap-2">
						<IconSlot iconPath={entry.iconPath} label={entry.title} />
						<div>
							<p className="text-[11px] tracking-[0.14em] text-white/45 uppercase">
								Perk
							</p>
							<p className="text-sm font-medium text-white/90">{entry.title}</p>
						</div>
					</div>
				</div>
			</div>

			<p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-white/90">
				<TextWithTooltips
					text={entry.description}
					annotations={entry.annotations}
					keywordById={keywordMap}
					onKeywordHover={onKeywordHover}
					onKeywordLeave={onKeywordLeave}
					onKeywordClick={onKeywordClick}
				/>
			</p>
		</>
	);
}

function DefaultContent({
	entry,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
				keywordById={keywordMap}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
			/>
		</p>
	);
}

function TooltipBody(props: TooltipContentProps) {
	if (props.entry.kind === "exotic_item_perk") {
		return <ExoticContent {...props} />;
	}

	if (props.entry.kind === "armor_set_bonus") {
		return <SetBonusContent {...props} />;
	}

	return <DefaultContent {...props} />;
}

export function Tooltip({
	entry,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipProps) {
	return (
		<article key={entry.id} className="border border-white/10 bg-white/6 p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs tracking-[0.18em] text-white/45 uppercase">
						{entry.section ?? "Unsectioned"}
					</p>
					<h3 className="mt-2 text-xl font-semibold text-white">
						{entry.title}
					</h3>
					<div className="mt-2">
						<EntryKindBadge kind={entry.kind} />
					</div>
				</div>
				<span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/65">
					{entry.sourceId ?? "sheet"}: r{entry.source.row + 1} c
					{entry.source.column + 1}
				</span>
			</div>

			<TooltipBody
				entry={entry}
				keywordMap={keywordMap}
				onKeywordHover={onKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={onKeywordClick}
			/>

			{entry.extraInfo ? (
				<p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-white/60">
					{entry.extraInfo}
				</p>
			) : null}
		</article>
	);
}
