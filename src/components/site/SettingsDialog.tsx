"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X } from "lucide-react";

import {
	DESCRIPTION_SOURCE_LABELS,
	DESCRIPTION_SOURCE_TOGGLES,
	type TooltipAlign,
	useSettingsStore,
} from "@/lib/site/settingsStore";
import { cn } from "@/lib/utils/utils";

const ALIGN_OPTIONS: { value: TooltipAlign; label: string }[] = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
			{children}
		</p>
	);
}

function SourceToggles() {
	const visibleSources = useSettingsStore((state) => state.visibleSources);
	const toggleSource = useSettingsStore((state) => state.toggleSource);
	const hasVisibleSource = DESCRIPTION_SOURCE_TOGGLES.some(
		(id) => visibleSources[id],
	);

	return (
		<div className="space-y-2">
			<SectionHeading>Descriptions visibility</SectionHeading>

			<div className="flex flex-col gap-4 pt-1">
				{DESCRIPTION_SOURCE_TOGGLES.map((id) => {
					const isVisible = visibleSources[id];

					return (
						<button
							key={id}
							type="button"
							onClick={() => toggleSource(id)}
							aria-pressed={isVisible}
							className={cn(
								"borderHover flex items-center justify-between px-3 py-2 text-sm transition",
								isVisible
									? "bg-blue-500/25 text-sky-100"
									: "bg-blue-500/8 text-white/55 hover:bg-blue-500/15",
							)}
						>
							<span>{DESCRIPTION_SOURCE_LABELS[id]}</span>
							<span className="text-masterwork text-[11px] tracking-[0.14em] uppercase">
								{isVisible ? "Shown" : "Hidden"}
							</span>
						</button>
					);
				})}
			</div>

			{hasVisibleSource ? null : (
				<p className="text-xs text-amber-300/80">
					Every source is hidden - cards will have no description text.
				</p>
			)}
		</div>
	);
}

function AlignToggle() {
	const tooltipAlign = useSettingsStore((state) => state.tooltipAlign);
	const setTooltipAlign = useSettingsStore((state) => state.setTooltipAlign);

	return (
		<div className="space-y-2">
			<SectionHeading>Tooltip text alignment</SectionHeading>

			<div className="flex gap-2 pt-1">
				{ALIGN_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => setTooltipAlign(option.value)}
						aria-pressed={tooltipAlign === option.value}
						className={cn(
							"borderHover flex-1 px-3 py-2 text-sm transition",
							tooltipAlign === option.value
								? "borderActive bg-blue-500/25 text-sky-100"
								: "bg-blue-500/8 text-white/55 hover:bg-blue-500/15",
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}

export function SettingsDialog() {
	return (
		<Dialog.Root>
			<Dialog.Trigger
				aria-label="Open settings"
				className="borderHover group bg-blue-500/10 p-2 text-white/68 hover:bg-blue-500/20"
			>
				<Settings
					size={18}
					className="transition-all duration-300 ease-in-out group-hover:rotate-90 group-data-[state=open]:-rotate-90"
				/>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className="data-[state=closed]:animate-dialog-overlay-out data-[state=open]:animate-dialog-overlay-in fixed inset-0 z-50 bg-black/60" />
				<Dialog.Content className="data-[state=closed]:animate-dialog-content-out data-[state=open]:animate-dialog-content-in fixed top-1/2 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 border border-white/14 bg-black/92 p-4 shadow-2xl shadow-black/60">
					<div className="flex items-center justify-between">
						<Dialog.Title className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
							Settings
						</Dialog.Title>
						<Dialog.Close
							aria-label="Close settings"
							className="borderHover bg-red-500/15 p-1.5 text-red-500 hover:bg-red-500/30"
						>
							<X size={16} />
						</Dialog.Close>
					</div>

					<Dialog.Description className="mt-3 text-xs text-white/50">
						Entries can carry text from more than one source. Pick which ones
						show up on a card.
					</Dialog.Description>

					<div className="mt-4 space-y-5">
						<SourceToggles />
						<AlignToggle />
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
