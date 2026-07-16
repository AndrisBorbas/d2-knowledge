import { cva, VariantProps } from "class-variance-authority";
import { createMemo, type JSX } from "solid-js";

import type { Annotation, Keyword } from "~/lib/sheet/model";
import { cn } from "~/lib/utils";

const tooltipButtonVariants = cva("rounded-full", {
	variants: {
		variant: {
			default:
				"bg-gray-100 border-gray-300 focus:border-gray-400 active:border-gray-400",
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

type TooltipButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
	keyword: Keyword;
	onKeywordClick?: (keywordId: string) => void;
	onKeywordHover?: (keywordId: string) => void;
	onKeywordLeave?: () => void;
} & VariantProps<typeof tooltipButtonVariants>;

function TooltipButton(props: TooltipButtonProps) {
	return (
		<button
			type="button"
			title={`Open ${props.keyword.label}`}
			{...props}
			onClick={() => props.onKeywordClick?.(props.keyword.id)}
			onMouseEnter={() => props.onKeywordHover?.(props.keyword.id)}
			onMouseLeave={props.onKeywordLeave}
			class={cn(
				tooltipButtonVariants({
					variant: props.variant ?? props.keyword.variant,
					size: props.size,
					class: props.class,
				}),
			)}
		>
			{props.keyword.label}
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
	const segments = createMemo(() => {
		const sorted = props.annotations
			.filter((item) => item.end > item.start && item.start >= 0)
			.sort((a, b) => a.start - b.start);

		const nodes: JSX.Element[] = [];
		let cursor = 0;

		for (const annotation of sorted) {
			if (annotation.start > cursor) {
				nodes.push(props.text?.slice(cursor, annotation.start) ?? "");
			}

			const keyword = props.keywordById.get(annotation.keywordId);
			if (!keyword) {
				nodes.push(props.text?.slice(annotation.start, annotation.end) ?? "");
				cursor = annotation.end;
				continue;
			}

			nodes.push(
				<TooltipButton
					keyword={keyword}
					onKeywordClick={props.onKeywordClick}
					onKeywordHover={props.onKeywordHover}
					onKeywordLeave={props.onKeywordLeave}
				/>,
			);

			cursor = annotation.end;
		}

		if (props.text && cursor < props.text.length) {
			nodes.push(props.text.slice(cursor));
		}

		return nodes;
	});

	return <>{segments()}</>;
}
