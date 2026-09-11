import { cn } from "@/lib/utils/utils";
import { RANK_BADGE_CLASS } from "@/lib/weapons/display";
import type { LegendEntry, TierRank } from "@/lib/weapons/model";

type TierBadgeProps = {
	tier: TierRank | null;
	legend?: LegendEntry[];
	className?: string;
};

export function TierBadge({ tier, legend, className }: TierBadgeProps) {
	if (!tier) {
		return <span className={cn("text-white/30", className)}>-</span>;
	}

	// The sheet defines every rank in its own words, so the tooltip quotes it
	// rather than paraphrasing.
	const meaning = legend?.find((entry) => entry.symbol === tier)?.meaning;

	return (
		<span
			title={meaning}
			className={cn(
				"inline-flex size-6 items-center justify-center border text-xs font-black",
				RANK_BADGE_CLASS[tier],
				className,
			)}
		>
			{tier}
		</span>
	);
}
