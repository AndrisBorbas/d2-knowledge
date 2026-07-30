"use client";

import { cva, VariantProps } from "class-variance-authority";
import { MoveUp, Settings, SquareArrowRightExit } from "lucide-react";

import { getKeywordColor } from "@/lib/compendium/keywords/color";
import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";
import { cn } from "@/lib/utils/utils";

import type { KeywordClickPayload, KeywordHoverPayload } from "./types";

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

type ExtraElementProps = {
	keyword: Keyword;
} & React.ComponentPropsWithoutRef<typeof MoveUp>;

function ExtraElement({ keyword, className, ...restProps }: ExtraElementProps) {
	if (keyword.types.includes("Buff")) {
		return (
			<MoveUp
				className={cn("my-auto text-green-400", className)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Debuff")) {
		return (
			<MoveUp
				className={cn("my-auto rotate-180 text-red-400", className)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Elemental Pickup")) {
		return (
			<SquareArrowRightExit
				className={cn(
					"my-auto mr-0.5 ml-0.5 -rotate-90 text-blue-400",
					className,
				)}
				{...restProps}
			/>
		);
	}
	if (keyword.types.includes("Construct")) {
		return (
			<Settings
				className={cn("my-auto ml-0.5 rotate-30 text-yellow-400", className)}
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

export function TooltipButton({
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
