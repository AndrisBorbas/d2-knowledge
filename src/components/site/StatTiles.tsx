import Link from "next/link";

import { cn } from "@/lib/utils/utils";

export type StatTile = {
	label: string;
	value: string;
	/** Makes the whole tile a link, e.g. to where the counted data comes from. */
	href?: string;
};

type StatTilesProps = {
	tiles: StatTile[];
	className?: string;
};

export function StatTiles({ tiles, className }: StatTilesProps) {
	return (
		<div className={cn("grid gap-3 md:grid-cols-3", className)}>
			{tiles.map((tile) => {
				const body = (
					<>
						<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
							{tile.label}
						</div>
						<div className="mt-2 text-2xl font-semibold text-white">
							{tile.value}
						</div>
					</>
				);

				return tile.href ? (
					<Link
						key={tile.label}
						href={tile.href}
						className="borderHover block bg-white/6 p-4 transition hover:bg-white/10"
					>
						{body}
					</Link>
				) : (
					<div key={tile.label} className="borderHover bg-white/6 p-4">
						{body}
					</div>
				);
			})}
		</div>
	);
}
