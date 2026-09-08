"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Settings } from "lucide-react";

import { Button, CloseButton } from "@/components/ui/Button";
import {
	DESCRIPTION_SOURCE_LABELS,
	DESCRIPTION_SOURCE_TOGGLES,
	EXTRA_INFO_ORDER_LABELS,
	EXTRA_INFO_ORDERS,
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

	return (
		<div className="space-y-2">
			<SectionHeading>Descriptions visibility</SectionHeading>

			<div className="flex flex-col gap-4 pt-1">
				{DESCRIPTION_SOURCE_TOGGLES.map((id) => {
					const isVisible = visibleSources[id];

					return (
						<Button
							key={id}
							variant="option"
							size="option"
							active={isVisible}
							onClick={() => toggleSource(id)}
							aria-pressed={isVisible}
							// The bg carries the state here, so the frame stays off.
							className="flex items-center justify-between after:inset-0 after:border-gray-500/0 after:border-t-gray-500"
						>
							<span>{DESCRIPTION_SOURCE_LABELS[id]}</span>
							<span className="text-masterwork text-[11px] tracking-[0.14em] uppercase">
								{isVisible ? "Shown" : "Hidden"}
							</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
}

function ExtraInfoFallbackToggle() {
	const alwaysShowExtraInfo = useSettingsStore(
		(state) => state.alwaysShowExtraInfo,
	);
	const toggleAlwaysShowExtraInfo = useSettingsStore(
		(state) => state.toggleAlwaysShowExtraInfo,
	);

	return (
		<div className="space-y-2">
			<SectionHeading>Extra info fallback</SectionHeading>

			<button
				type="button"
				onClick={toggleAlwaysShowExtraInfo}
				aria-pressed={alwaysShowExtraInfo}
				className={cn(
					"borderHover flex w-full items-center justify-between px-3 py-2 text-sm transition",
					alwaysShowExtraInfo
						? "bg-blue-500/25 text-sky-100"
						: "bg-blue-500/8 text-white/55 hover:bg-blue-500/15",
				)}
			>
				<span>Always show extra info</span>
				<span className="text-masterwork text-[11px] tracking-[0.14em] uppercase">
					{alwaysShowExtraInfo ? "On" : "Off"}
				</span>
			</button>

			<p className="text-xs text-white/45">
				When every community description an entry carries comes from a hidden
				source, show it anyway instead of leaving the card without one.
			</p>
		</div>
	);
}

function ExtraInfoOrderToggle() {
	const extraInfoOrder = useSettingsStore((state) => state.extraInfoOrder);
	const setExtraInfoOrder = useSettingsStore(
		(state) => state.setExtraInfoOrder,
	);

	return (
		<div className="space-y-2">
			<SectionHeading>Extra info order</SectionHeading>

			<div className="flex gap-2 pt-1">
				{EXTRA_INFO_ORDERS.map((order) => (
					<Button
						key={order}
						variant="option"
						size="option"
						active={extraInfoOrder === order}
						onClick={() => setExtraInfoOrder(order)}
						aria-pressed={extraInfoOrder === order}
						className="flex-1 px-2 text-xs"
					>
						{EXTRA_INFO_ORDER_LABELS[order]}
					</Button>
				))}
			</div>

			<p className="text-xs text-white/45">
				Which community source stacks on top when an entry carries both.
				Automatic keeps the per-category order. The in-game text is unaffected.
			</p>
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
					<Button
						key={option.value}
						variant="option"
						size="option"
						active={tooltipAlign === option.value}
						onClick={() => setTooltipAlign(option.value)}
						aria-pressed={tooltipAlign === option.value}
						className="flex-1"
					>
						{option.label}
					</Button>
				))}
			</div>
		</div>
	);
}

export function SettingsDialog() {
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Button
					variant="subtle"
					size="icon"
					aria-label="Open settings"
					className="group"
				>
					<Settings
						size={18}
						className="transition-all duration-300 ease-in-out group-hover:rotate-90 group-data-[state=open]:-rotate-90"
					/>
				</Button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className="data-[state=closed]:animate-dialog-overlay-out data-[state=open]:animate-dialog-overlay-in fixed inset-0 z-50 bg-black/60" />
				<Dialog.Content className="data-[state=closed]:animate-dialog-content-out data-[state=open]:animate-dialog-content-in fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,44rem)] w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 flex-col border border-white/14 bg-black/92 p-4 shadow-2xl shadow-black/60">
					<div className="flex shrink-0 items-center justify-between">
						<Dialog.Title className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
							Settings
						</Dialog.Title>
						<Dialog.Close asChild>
							<CloseButton
								variant="danger"
								size="iconSm"
								label="Close settings"
							/>
						</Dialog.Close>
					</div>

					{/* Scrolls on its own so a short viewport never pushes settings off
					    screen - the title row above stays put. */}
					{/* `overflow-y-auto` clips horizontally too, and the borderHover
					    frame grows 6px past its element on every side, so the
					    scroll area is widened by that much on both edges. */}
					<div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
						<Dialog.Description className="mt-3 text-xs text-white/50">
							Entries can carry text from more than one source. Pick which ones
							show up on a card.
						</Dialog.Description>

						<div className="mt-4 space-y-5">
							<SourceToggles />
							<ExtraInfoFallbackToggle />
							<ExtraInfoOrderToggle />
							<AlignToggle />
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
