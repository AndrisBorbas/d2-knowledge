import { cn } from "@/lib/utils/utils";

export type StatTile = {
	label: string;
	value: string;
};

type StatTilesProps = {
	tiles: StatTile[];
	className?: string;
};

export function StatTiles({ tiles, className }: StatTilesProps) {
	return (
		<div className={cn("grid gap-3 md:grid-cols-3", className)}>
			{tiles.map((tile) => (
				<div key={tile.label} className="borderHover bg-white/6 p-4">
					<div className="text-xs tracking-[0.2em] text-white/50 uppercase">
						{tile.label}
					</div>
					<div className="mt-2 text-2xl font-semibold text-white">
						{tile.value}
					</div>
				</div>
			))}
		</div>
	);
}
