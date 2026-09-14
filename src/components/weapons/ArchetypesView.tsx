"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
	ARCHETYPES_TAB,
	ENDGAME_SHEET_URL,
	sheetTabUrl,
	TierRank,
} from "@/lib/aegis/config";
import {
	cellSortValue,
	formatCell,
	statusForTab,
	TIER_ORDER,
} from "@/lib/weapons/display";
import type { ArchetypeRow, WeaponsDataset } from "@/lib/weapons/model";

import { SheetCredit } from "./SheetCredit";
import { SortableTable, type TableColumn } from "./SortableTable";
import { TierBadge } from "./TierBadge";

type ArchetypesViewProps = {
	dataset: WeaponsDataset;
	query: string;
};

// The sheet computes far more per frame than fits on a screen, so the columns
// come in two named sets: what was measured, and what was derived from it.
// Names are the sheet's own, so a reader can cross-check against the tab.
// Which of the sheet's banners a column sits under is not the same question:
// `ADS falloff Range` is a measured distance that the sheet files under
// CALCULATIONS, so the cell is looked up in both records rather than in the
// one the set is named after.
const VALUE_COLUMNS = [
	"base Damage",
	"crit Multi",
	"true RPM",
	"tested Mag",
	"base Reload",
	"minor Scalar",
	"elite Scalar",
	"ADS falloff Range",
];

const CALCULATION_COLUMNS = [
	"typical MDPS",
	"body MDPS",
	"typical BDPS",
	"max BDPS",
	"add Score",
	"boss Score",
	"minor Total",
	"boss Total",
];

// The sheet moves a column between its banners now and then, and a reader
// looking for `ADS falloff Range` does not care which one it ended up under.
function cellFor(row: ArchetypeRow, name: string) {
	return row.values[name] ?? row.calculations[name];
}

const GRID_CLASS =
	"grid min-w-[64rem] grid-cols-[9rem_9rem_2rem_5rem_repeat(8,minmax(4.5rem,1fr))] items-center gap-3";

export function ArchetypesView({ dataset, query }: ArchetypesViewProps) {
	const [showCalculations, setShowCalculations] = useState(false);
	const numericColumns = showCalculations ? CALCULATION_COLUMNS : VALUE_COLUMNS;

	const rows = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (needle.length === 0) return dataset.archetypes;
		return dataset.archetypes.filter((row) =>
			[row.weapon, row.frame, row.frameNote, row.notes]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(needle),
		);
	}, [dataset.archetypes, query]);

	const columns = useMemo<TableColumn<ArchetypeRow>[]>(() => {
		return [
			{
				key: "weapon",
				label: "Weapon",
				sortValue: (row) => row.weapon,
				render: (row) => <span className="text-white">{row.weapon}</span>,
			},
			{
				key: "frame",
				label: "Frame",
				sortValue: (row) => row.frame,
				render: (row) => (
					<span title={row.frameNote}>
						{row.frame}
						{row.frameNote ? <span className="text-white/40"> *</span> : null}
					</span>
				),
			},
			{
				key: "tier",
				label: "Tier",
				sortValue: (row) => TIER_ORDER.indexOf(row.tier as TierRank),
				render: (row) => (
					<TierBadge tier={row.tier} legend={dataset.tierLegend} />
				),
			},
			{
				key: "ammo",
				label: "Ammo",
				sortValue: (row) => row.ammoSlot ?? "",
				render: (row) => row.ammoSlot ?? "-",
			},
			...numericColumns.map((name): TableColumn<ArchetypeRow> => ({
				key: name,
				label: name,
				align: "right",
				sortValue: (row) => cellSortValue(cellFor(row, name)),
				render: (row) => formatCell(cellFor(row, name)),
			})),
		];
	}, [dataset.tierLegend, numericColumns]);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="subtle"
					size="xs"
					active={!showCalculations}
					aria-pressed={!showCalculations}
					onClick={() => {
						setShowCalculations(false);
					}}
				>
					Measured values
				</Button>
				<Button
					variant="subtle"
					size="xs"
					active={showCalculations}
					aria-pressed={showCalculations}
					onClick={() => {
						setShowCalculations(true);
					}}
				>
					Calculated DPS
				</Button>
			</div>

			<SheetCredit
				sheet="endgame"
				status={statusForTab(dataset.status, ARCHETYPES_TAB.tab)}
				tabUrl={sheetTabUrl(ENDGAME_SHEET_URL, ARCHETYPES_TAB.gid)}
				tabLabel={ARCHETYPES_TAB.tab}
			/>

			<p className="text-xs leading-6 text-white/45">
				A frame marked * assumes a particular roll, which the sheet names in the
				frame cell. MDPS is minor DPS, BDPS is boss DPS.
			</p>

			<SortableTable
				rows={rows}
				columns={columns}
				rowKey={(row) => row.id}
				gridClass={GRID_CLASS}
				initialSort={{ key: "weapon", direction: "asc" }}
			/>
		</div>
	);
}
