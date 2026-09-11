import Image from "next/image";

import { cn } from "@/lib/utils/utils";

type WeaponIconProps = {
	name: string;
	iconPath?: string;
	watermarkPath?: string;
	className?: string;
};

// The sheets draw weapon icons as in-cell images, which no export carries, so
// the icon is matched out of the Bungie manifest by name. A name the manifest
// does not know degrades to a lettered square rather than a broken image.
export function WeaponIcon({
	name,
	iconPath,
	watermarkPath,
	className,
}: WeaponIconProps) {
	if (!iconPath) {
		return (
			<div
				aria-hidden
				className={cn(
					"flex size-8 shrink-0 items-center justify-center border border-blue-500/40 bg-blue-950/40 text-xs font-semibold text-white/50",
					className,
				)}
			>
				{name.slice(0, 1)}
			</div>
		);
	}

	return (
		<div className={cn("relative size-8 shrink-0", className)}>
			<Image src={iconPath} alt="" width={32} height={32} className="size-8" />
			{watermarkPath ? (
				<Image
					src={watermarkPath}
					alt=""
					width={32}
					height={32}
					className="absolute inset-0 size-8"
				/>
			) : null}
		</div>
	);
}
