"use client";

import { useTooltipAlignStore } from "@/lib/site/tooltipAlignStore";

export function TooltipAlignToggle() {
	const align = useTooltipAlignStore((state) => state.align);
	const toggle = useTooltipAlignStore((state) => state.toggle);

	return (
		<button
			type="button"
			onClick={toggle}
			className="borderHover inline-flex items-center gap-2 bg-blue-950/20 px-3 py-1 text-xs text-white/60 transition hover:bg-blue-950/40"
			aria-pressed={align === "left"}
		>
			Tooltip text:{" "}
			<span className="text-masterwork font-medium">
				{align === "left" ? "Left" : "Center"}
			</span>
		</button>
	);
}
