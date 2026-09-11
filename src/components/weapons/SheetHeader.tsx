import {
	DPS_SHEET_NAME,
	DPS_SHEET_URL,
	ENDGAME_SHEET_NAME,
	ENDGAME_SHEET_URL,
	SHEET_AUTHOR,
} from "@/lib/aegis/config";
import type { WeaponsDataset } from "@/lib/weapons/model";

type SheetHeaderProps = {
	dataset: WeaponsDataset;
	// False until the full dataset has arrived, so the counts do not claim more
	// than is on screen.
	isComplete: boolean;
};

const LINK_CLASS =
	"text-sky-200 underline decoration-sky-200/40 underline-offset-4 transition hover:decoration-sky-200";

function formatDate(value: string) {
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf())
		? value
		: parsed.toISOString().slice(0, 10);
}

export function SheetHeader({ dataset, isComplete }: SheetHeaderProps) {
	return (
		<header className="space-y-4">
			<h1 className="font-display text-3xl font-black uppercase lg:text-5xl">
				Weapons
			</h1>
			<p className="max-w-3xl text-sm leading-7 text-white/72">
				Every legendary and exotic weapon rated for endgame PvE, the damage math
				behind each archetype, and the measured boss damage the ratings rest on.
				This is a reading of two community spreadsheets, both researched and
				maintained by {SHEET_AUTHOR}:{" "}
				<a
					href={ENDGAME_SHEET_URL}
					target="_blank"
					rel="noreferrer"
					className={LINK_CLASS}
				>
					{ENDGAME_SHEET_NAME}
				</a>{" "}
				and the{" "}
				<a
					href={DPS_SHEET_URL}
					target="_blank"
					rel="noreferrer"
					className={LINK_CLASS}
				>
					{DPS_SHEET_NAME}
				</a>
				. Every view links back to the tab it came from.
			</p>
			<p className="text-xs tracking-[0.12em] text-white/45 uppercase">
				{isComplete
					? `${dataset.tierRows.length} legendaries, ${dataset.exotics.length} exotics, ${dataset.archetypes.length} archetypes, ${dataset.bosses.length} bosses`
					: "Loading the full dataset"}
				{" | "}
				Snapshot {formatDate(dataset.endgameGeneratedAt)}
			</p>
		</header>
	);
}
