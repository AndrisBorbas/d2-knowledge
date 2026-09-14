import Image from "next/image";

import type { WeaponBreaker } from "@/lib/weapons/model";

type BreakerGlyphProps = {
	breaker?: WeaponBreaker;
	iconPath?: string;
};

// Every weapon frame counters a champion, so this sits on the row rather than
// behind an expander. A weapon whose frame carries no tag shows nothing rather
// than an empty slot, since a blank would read as "counters nothing" when the
// truth is that the manifest did not say.
export function BreakerGlyph({ breaker, iconPath }: BreakerGlyphProps) {
	if (!breaker) return null;

	return (
		<span
			title={`Breaks ${breaker} Champions`}
			className="inline-flex shrink-0 items-center"
		>
			{iconPath ? (
				<Image
					src={iconPath}
					alt={`${breaker} Champions`}
					width={16}
					height={16}
					className="size-4"
				/>
			) : (
				<span className="text-[11px] font-semibold tracking-wide text-amber-200/80 uppercase">
					{breaker}
				</span>
			)}
		</span>
	);
}
