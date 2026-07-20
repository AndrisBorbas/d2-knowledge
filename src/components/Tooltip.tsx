"use client";

import { cva, VariantProps } from "class-variance-authority";
import { MoveUp, SquareArrowRightExit } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { getKeywordColor } from "@/lib/data/glossary";
import type { AnnotatedEntry, Annotation, Keyword } from "@/lib/sheet/model";
import { cn } from "@/lib/utils/utils";

const tooltipButtonVariants = cva("font-bold cursor-pointer", {
	variants: {
		color: {
			default: "text-white",
			arc: "text-arc",
			solar: "text-solar",
			void: "text-void",
			stasis: "text-stasis",
			strand: "text-strand",
			prismatic: "text-prismatic",
			masterwork: "text-masterwork",
		},
		size: {
			default: "text-sm",
		},
	},
	defaultVariants: {
		color: "default",
		size: "default",
	},
});

type KeywordHoverPayload = {
	keywordId: string;
	anchorRect: DOMRect;
};

type KeywordClickPayload = {
	keywordId: string;
};

type TooltipKeywordHoverPayload = KeywordHoverPayload & {
	entryId: string;
};

type TooltipKeywordClickPayload = KeywordClickPayload & {
	entryId: string;
};

type ExtraElementProps = {
	keyword: Keyword;
} & React.ComponentPropsWithoutRef<typeof MoveUp>;

function ExtraElement({ keyword, className, ...restProps }: ExtraElementProps) {
	if (keyword.types.includes("Buff")) {
		return (
			<MoveUp
				className={cn("my-auto -ml-0.5 text-green-400", className)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Debuff")) {
		return (
			<MoveUp
				className={cn("my-auto -ml-0.5 rotate-180 text-red-400", className)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Elemental Pickup")) {
		return (
			<SquareArrowRightExit
				className={cn(
					"my-auto mr-1 ml-0.5 -rotate-90 text-blue-400",
					className,
				)}
				{...restProps}
			/>
		);
	}
	return null;
}

type TooltipButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	keyword: Keyword;
	entry: AnnotatedEntry;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
} & VariantProps<typeof tooltipButtonVariants>;

function TooltipButton({
	keyword,
	entry,
	onKeywordClick,
	onKeywordHover,
	onKeywordLeave,
	color,
	size,
	className,
	...restProps
}: TooltipButtonProps) {
	const handleHover = (target: HTMLButtonElement) => {
		onKeywordHover?.({
			keywordId: keyword.id,
			anchorRect: target.getBoundingClientRect(),
		});
	};

	return (
		<button
			type="button"
			title={`Open ${keyword.label}`}
			onClick={() => onKeywordClick?.({ keywordId: keyword.id })}
			onMouseEnter={(event) => handleHover(event.currentTarget)}
			onFocus={(event) => handleHover(event.currentTarget)}
			onMouseLeave={onKeywordLeave}
			onBlur={onKeywordLeave}
			className={cn(
				tooltipButtonVariants({
					color: color ?? getKeywordColor(keyword, entry) ?? "default",
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
	entry: AnnotatedEntry;
	entryMap: Map<string, AnnotatedEntry>;
	keywordById: Map<string, Keyword>;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
};

function resolveColorEntry(
	keyword: Keyword,
	entry: AnnotatedEntry,
	entryMap: Map<string, AnnotatedEntry>,
): AnnotatedEntry {
	const referencedEntryId = keyword.references.find((id) => entryMap.has(id));
	if (!referencedEntryId) {
		return entry;
	}

	return entryMap.get(referencedEntryId) ?? entry;
}

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
				entry={resolveColorEntry(keyword, props.entry, props.entryMap)}
				onKeywordClick={props.onKeywordClick}
				onKeywordHover={props.onKeywordHover}
				onKeywordLeave={props.onKeywordLeave}
				className="inline-flex align-bottom"
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
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: TooltipKeywordClickPayload) => void;
};

type TooltipContentProps = {
	entry: AnnotatedEntry;
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
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
			<div className="relative border border-white/20 bg-black/50">
				<Image
					src={iconPath}
					alt={label}
					width={48}
					height={48}
					objectFit="cover"
					className="size-12 object-cover"
				/>
			</div>
		);
	}

	return (
		<div className="border border-dashed border-white/20 bg-black/30 text-[10px] text-white/50">
			<div className="flex size-12 items-center justify-center">N/A</div>
		</div>
	);
}

function SetBonusContent({
	entry,
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="p-4 text-sm leading-7 whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
				entry={entry}
				entryMap={entryMap}
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
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<>
			<div className="grid gap-2 px-4 sm:grid-cols-2">
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

			<p className="p-4 text-sm leading-7 whitespace-pre-wrap text-white/90">
				<TextWithTooltips
					text={entry.description}
					annotations={entry.annotations}
					entry={entry}
					entryMap={entryMap}
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
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipContentProps) {
	return (
		<p className="p-4 text-center text-sm whitespace-pre-wrap text-white/90">
			<TextWithTooltips
				text={entry.description}
				annotations={entry.annotations}
				entry={entry}
				entryMap={entryMap}
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
	entryMap,
	keywordMap,
	onKeywordHover,
	onKeywordLeave,
	onKeywordClick,
}: TooltipProps) {
	const handleKeywordHover = (payload: KeywordHoverPayload) => {
		onKeywordHover?.({
			keywordId: payload.keywordId,
			anchorRect: payload.anchorRect,
			entryId: entry.id,
		});
	};

	const handleKeywordClick = (payload: KeywordClickPayload) => {
		onKeywordClick?.({
			keywordId: payload.keywordId,
			entryId: entry.id,
		});
	};

	return (
		<article
			key={entry.id}
			className="h-fit border border-white/10 bg-blue-950/10 backdrop-blur-md"
		>
			<div className="flex items-center justify-start gap-4 border-b border-blue-600/50 bg-blue-950/30">
				<div className="bg-blue-950/50 p-2">
					<IconSlot iconPath={entry.iconPath} label={entry.title} />
				</div>
				<h3 className="text-xl font-semibold text-white">{entry.title}</h3>
			</div>

			<TooltipBody
				entry={entry}
				entryMap={entryMap}
				keywordMap={keywordMap}
				onKeywordHover={handleKeywordHover}
				onKeywordLeave={onKeywordLeave}
				onKeywordClick={handleKeywordClick}
			/>

			{entry.extraInfo ? (
				<p className="m-4 mt-0 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-white/60">
					{entry.extraInfo}
				</p>
			) : null}
		</article>
	);
}
