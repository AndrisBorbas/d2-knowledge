"use client";

import type { ReactNode } from "react";

import type { Annotation, Keyword } from "@/lib/sheet/model";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const tooltipButtonVariants = cva("rounded-full", {
	variants: {
		variant: {
			default:
				"bg-white/14 border-gray-300 focus:border-gray-400 active:border-gray-400",
			arc: "bg-arc",
			solar: "bg-solar",
			void: "bg-void",
			stasis: "bg-stasis",
			strand: "bg-strand",
			prismatic: "bg-prismatic",
			masterwork: "bg-masterwork",
		},
		size: {
			default: "px-2 py-1",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

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
	variant,
	size,
	className,
	...props
}: TooltipButtonProps) {
	return (
		<button
			type="button"
			title={`Open ${keyword.label}`}
			{...props}
			onClick={() => onKeywordClick?.(keyword.id)}
			onMouseEnter={() => onKeywordHover?.(keyword.id)}
			onMouseLeave={onKeywordLeave}
			className={cn(
				tooltipButtonVariants({
					variant: variant ?? keyword.variant,
					size: size,
					className: className,
				}),
			)}
		>
			{props.children ?? keyword.label}
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
				className="mx-0.5 inline-flex align-baseline"
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
