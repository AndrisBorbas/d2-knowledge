import {
	DPS_SHEET_NAME,
	DPS_SHEET_URL,
	ENDGAME_SHEET_NAME,
	ENDGAME_SHEET_URL,
	SHEET_AUTHOR,
} from "@/lib/aegis/config";
import type { TabStatus } from "@/lib/weapons/model";

type SheetCreditProps = {
	// Which sheet the view on screen came from.
	sheet: "endgame" | "dps";
	// The sheet's own note on when this tab was last revised, where it has one.
	status?: TabStatus;
	// Deep link to the exact tab being shown.
	tabUrl?: string;
	tabLabel?: string;
};

const LINK_CLASS =
	"text-sky-200 underline decoration-sky-200/40 underline-offset-4 transition hover:decoration-sky-200";

export function SheetCredit({
	sheet,
	status,
	tabUrl,
	tabLabel,
}: SheetCreditProps) {
	const isEndgame = sheet === "endgame";
	const sheetName = isEndgame ? ENDGAME_SHEET_NAME : DPS_SHEET_NAME;
	const sheetUrl = isEndgame ? ENDGAME_SHEET_URL : DPS_SHEET_URL;

	return (
		<p className="text-xs leading-6 text-white/60">
			Ratings and numbers from{" "}
			<a
				href={sheetUrl}
				target="_blank"
				rel="noreferrer"
				className={LINK_CLASS}
			>
				{sheetName}
			</a>{" "}
			by {SHEET_AUTHOR}.
			{status ? ` ${status.tab} last updated ${status.updated}.` : null}
			{tabUrl && tabLabel ? (
				<>
					{" "}
					<a
						href={tabUrl}
						target="_blank"
						rel="noreferrer"
						className={LINK_CLASS}
					>
						Open the {tabLabel} tab
					</a>
					.
				</>
			) : null}
		</p>
	);
}
