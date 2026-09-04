"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type LucideIcon, Pin, PinOff, X } from "lucide-react";

import { cn } from "@/lib/utils/utils";

export const buttonVariants = cva(
	"borderHover transition disabled:cursor-not-allowed disabled:bg-white/4 disabled:text-white/25",
	{
		variants: {
			variant: {
				// Plain chrome: clear, search, dismiss.
				neutral: "bg-white/8 text-white/75 hover:bg-white/14",
				// The one call to action in a surface.
				primary: "bg-blue-500/25 text-sky-100 hover:bg-blue-500/35",
				// Filter chips, nav links, icon triggers - anything that can be on.
				subtle: "bg-blue-500/10 text-white/68 hover:bg-blue-500/20",
				// Quieter cousin of `subtle`, for segmented controls in dialogs.
				option: "bg-blue-500/8 text-white/55 hover:bg-blue-500/15",
				// Recedes into the surface it sits on: group tags inside a tooltip.
				muted: "bg-blue-950/20 text-white/60 hover:bg-blue-950/40",
				// Destructive: clear all, unpin, remove.
				danger: "bg-red-500/15 text-red-500 hover:bg-red-500/30",
			},
			size: {
				xs: "px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase",
				sm: "px-3 py-1.5 text-xs font-semibold tracking-[0.08em] uppercase",
				md: "px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase",
				chip: "px-2.5 py-2 text-xs font-semibold tracking-[0.06em] uppercase",
				tag: "px-3 py-1 text-xs",
				option: "px-3 py-2 text-sm",
				icon: "p-2",
				iconSm: "p-1.5",
				iconXs: "p-1",
				none: "",
			},
			// Pressed/selected. ARIA stays at the call site, since the right
			// attribute differs: aria-pressed for a toggle, aria-current for a link.
			active: {
				true: "borderActive",
				false: "",
			},
		},
		compoundVariants: [
			{ variant: "subtle", active: true, class: "bg-blue-500/30 text-sky-100" },
			{ variant: "option", active: true, class: "bg-blue-500/25 text-sky-100" },
		],
		defaultVariants: {
			variant: "neutral",
			size: "sm",
			active: false,
		},
	},
);

export type ButtonProps = React.ComponentPropsWithRef<"button"> &
	VariantProps<typeof buttonVariants> & {
		// Hands the styling to the child element instead of rendering a <button>,
		// for links and for Radix primitives such as Popover.Close.
		asChild?: boolean;
	};

export function Button({
	asChild = false,
	variant,
	size,
	active,
	className,
	type,
	...restProps
}: ButtonProps) {
	const Component = asChild ? Slot : "button";

	return (
		<Component
			type={asChild ? type : (type ?? "button")}
			className={cn(buttonVariants({ variant, size, active, className }))}
			{...restProps}
		/>
	);
}

type IconActionButtonProps = Omit<ButtonProps, "children"> & {
	// Icon-only buttons carry no text, so they always need a name for screen
	// readers. Each one defaults to its verb; pass a specific label where the
	// target matters - "Close settings", "Unpin Radiant".
	label?: string;
	iconSize?: number;
};

export function IconActionButton({
	icon: Icon,
	label,
	iconSize,
	...restProps
}: IconActionButtonProps &
	Required<Pick<IconActionButtonProps, "label" | "iconSize">> & {
		icon: LucideIcon;
	}) {
	return (
		<Button aria-label={label} {...restProps}>
			<Icon size={iconSize} />
		</Button>
	);
}

export function CloseButton({
	label = "Close",
	iconSize = 16,
	size = "icon",
	...restProps
}: IconActionButtonProps) {
	return (
		<IconActionButton
			icon={X}
			label={label}
			iconSize={iconSize}
			size={size}
			{...restProps}
		/>
	);
}

export function PinButton({
	label = "Pin",
	iconSize = 14,
	size = "iconXs",
	variant = "subtle",
	...restProps
}: IconActionButtonProps) {
	return (
		<IconActionButton
			icon={Pin}
			label={label}
			iconSize={iconSize}
			size={size}
			variant={variant}
			{...restProps}
		/>
	);
}

export function UnpinButton({
	label = "Unpin",
	iconSize = 14,
	size = "iconXs",
	variant = "danger",
	...restProps
}: IconActionButtonProps) {
	return (
		<IconActionButton
			icon={PinOff}
			label={label}
			iconSize={iconSize}
			size={size}
			variant={variant}
			{...restProps}
		/>
	);
}
