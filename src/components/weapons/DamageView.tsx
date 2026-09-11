"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import {
	BOSSES_TAB,
	DAMAGE_TAB,
	DPS_SHEET_URL,
	sheetTabUrl,
	SUSTAINED_TAB,
} from "@/lib/aegis/config";
import { cellSortValue, formatCell } from "@/lib/weapons/display";
import type {
	BossRow,
	DamageShotRow,
	SustainedRow,
	WeaponsDataset,
} from "@/lib/weapons/model";

import { SheetCredit } from "./SheetCredit";
import { SortableTable, type TableColumn } from "./SortableTable";

export const DAMAGE_TABS = [
	["shots", "Per shot"],
	["sustained", "Sustained DPS"],
	["bosses", "Boss health"],
] as const;

export type DamageTab = (typeof DAMAGE_TABS)[number][0];

type DamageViewProps = {
	dataset: WeaponsDataset;
	query: string;
	tab: DamageTab;
	onTabChange: (tab: DamageTab) => void;
};

const SHOT_GRID =
	"grid min-w-[52rem] grid-cols-[8rem_minmax(0,1fr)_5rem_5rem_7rem_minmax(0,1fr)_6rem] items-center gap-3";
const SUSTAINED_GRID =
	"grid min-w-[56rem] grid-cols-[minmax(0,1.4fr)_5rem_6rem_5rem_5rem_6rem_6rem] items-center gap-3";
const BOSS_GRID =
	"grid min-w-[56rem] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_7rem_6rem_6rem_minmax(0,1fr)] items-center gap-3";

function matches(query: string, ...fields: (string | undefined)[]) {
	const needle = query.trim().toLowerCase();
	if (needle.length === 0) return true;
	return fields.filter(Boolean).join(" ").toLowerCase().includes(needle);
}

export function DamageView({
	dataset,
	query,
	tab,
	onTabChange,
}: DamageViewProps) {
	const shotRows = useMemo(
		() =>
			dataset.damageShots.filter((row) =>
				matches(query, row.weaponType, row.subtype, row.modifiers),
			),
		[dataset.damageShots, query],
	);

	const sustainedRows = useMemo(
		() =>
			dataset.sustained.filter((row) =>
				matches(query, row.name, row.loadout, row.family, row.slot),
			),
		[dataset.sustained, query],
	);

	const bossRows = useMemo(
		() =>
			dataset.bosses.filter((row) =>
				matches(query, row.boss, row.activity, row.species, row.mechanics),
			),
		[dataset.bosses, query],
	);

	const shotColumns: TableColumn<DamageShotRow>[] = [
		{
			key: "weaponType",
			label: "Type",
			sortValue: (row) => row.weaponType,
			render: (row) => row.weaponType,
		},
		{
			key: "subtype",
			label: "Frame or exotic",
			sortValue: (row) => row.subtype,
			render: (row) => <span className="text-white">{row.subtype}</span>,
		},
		{
			key: "crit",
			label: "Crit",
			align: "right",
			sortValue: (row) => cellSortValue(row.critShot),
			render: (row) => formatCell(row.critShot),
		},
		{
			key: "body",
			label: "Body",
			align: "right",
			sortValue: (row) => cellSortValue(row.bodyShot),
			render: (row) => formatCell(row.bodyShot),
		},
		{
			key: "normalized",
			label: "Normalized",
			align: "right",
			sortValue: (row) =>
				cellSortValue(
					row.healthbarValue.value === null
						? row.visualValue
						: row.healthbarValue,
				),
			render: (row) =>
				formatCell(
					row.healthbarValue.value === null
						? row.visualValue
						: row.healthbarValue,
				),
		},
		{
			key: "modifiers",
			label: "Conditions",
			secondary: true,
			render: (row) =>
				[row.modifiers, row.otherTicks].filter(Boolean).join(" - ") || "-",
		},
		{
			key: "patch",
			label: "Patch",
			secondary: true,
			align: "right",
			sortValue: (row) => row.patch ?? "",
			render: (row) => row.patch ?? "-",
		},
	];

	const sustainedColumns: TableColumn<SustainedRow>[] = [
		{
			key: "name",
			label: "Setup",
			sortValue: (row) => row.name,
			render: (row) => (
				<span title={row.loadout}>
					<span className="text-white">{row.name}</span>
					{row.loadout ? (
						<span className="text-white/45"> {row.loadout}</span>
					) : null}
				</span>
			),
		},
		{
			key: "slot",
			label: "Slot",
			secondary: true,
			sortValue: (row) => row.slot ?? "",
			render: (row) => row.slot ?? "-",
		},
		{
			key: "family",
			label: "Family",
			secondary: true,
			sortValue: (row) => row.family ?? "",
			render: (row) => row.family ?? "-",
		},
		{
			key: "tte",
			label: "TtE",
			align: "right",
			secondary: true,
			sortValue: (row) => cellSortValue(row.timeToEmpty),
			render: (row) => formatCell(row.timeToEmpty),
		},
		{
			key: "base",
			label: "Base",
			align: "right",
			secondary: true,
			sortValue: (row) => cellSortValue(row.base),
			render: (row) => formatCell(row.base),
		},
		{
			key: "total",
			label: "Total",
			align: "right",
			sortValue: (row) => cellSortValue(row.total),
			render: (row) => formatCell(row.total),
		},
		{
			key: "dps",
			label: "DPS",
			align: "right",
			sortValue: (row) => cellSortValue(row.dps),
			render: (row) => (
				<span className="font-semibold text-sky-200">
					{formatCell(row.dps)}
				</span>
			),
		},
	];

	const bossColumns: TableColumn<BossRow>[] = [
		{
			key: "activity",
			label: "Activity",
			sortValue: (row) => row.activity,
			render: (row) => row.activity,
		},
		{
			key: "boss",
			label: "Boss",
			sortValue: (row) => row.boss,
			render: (row) => <span className="text-white">{row.boss}</span>,
		},
		{
			key: "ingame",
			label: "Health",
			align: "right",
			sortValue: (row) => cellSortValue(row.ingameHealth),
			render: (row) => formatCell(row.ingameHealth),
		},
		{
			key: "effective",
			label: "Effective",
			align: "right",
			sortValue: (row) => cellSortValue(row.effectiveHealth),
			render: (row) => formatCell(row.effectiveHealth),
		},
		{
			key: "clearable",
			label: "Clear DPS",
			align: "right",
			secondary: true,
			sortValue: (row) => cellSortValue(row.clearableDps),
			render: (row) => formatCell(row.clearableDps),
		},
		{
			key: "onePhase",
			label: "1 phase",
			align: "right",
			secondary: true,
			sortValue: (row) => cellSortValue(row.onePhaseDps),
			render: (row) => formatCell(row.onePhaseDps),
		},
		{
			key: "notes",
			label: "Notes",
			secondary: true,
			render: (row) =>
				[row.onePhaseDescription, row.notes].filter(Boolean).join(" - ") || "-",
		},
	];

	const gid =
		tab === "shots"
			? DAMAGE_TAB.gid
			: tab === "sustained"
				? SUSTAINED_TAB.gid
				: BOSSES_TAB.gid;
	const tabName =
		tab === "shots"
			? DAMAGE_TAB.tab
			: tab === "sustained"
				? SUSTAINED_TAB.tab
				: BOSSES_TAB.tab;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{DAMAGE_TABS.map(([key, label]) => (
					<Button
						key={key}
						variant="subtle"
						size="xs"
						active={tab === key}
						aria-pressed={tab === key}
						onClick={() => {
							onTabChange(key);
						}}
					>
						{label}
					</Button>
				))}
			</div>

			<SheetCredit
				sheet="dps"
				tabUrl={sheetTabUrl(DPS_SHEET_URL, gid)}
				tabLabel={tabName}
			/>

			{tab === "shots" ? (
				<>
					<SortableTable
						rows={shotRows}
						columns={shotColumns}
						rowKey={(row) => row.id}
						gridClass={SHOT_GRID}
						initialSort={{ key: "normalized", direction: "desc" }}
					/>
					<p className="text-xs leading-6 text-white/45">
						Crit and body are the raw numbers a shot prints on a boss in the
						sheet&apos;s test conditions. Normalized scales those to one
						benchmark so two weapons can be compared directly.
					</p>
				</>
			) : null}

			{tab === "sustained" ? (
				<>
					<SortableTable
						rows={sustainedRows}
						columns={sustainedColumns}
						rowKey={(row) => row.id}
						gridClass={SUSTAINED_GRID}
						initialSort={{ key: "dps", direction: "desc" }}
					/>
					<p className="text-xs leading-6 text-white/45">
						Each row is one simulated damage rotation with the perks, surges and
						debuffs the sheet names. TtE is time to empty in seconds.
					</p>
				</>
			) : null}

			{tab === "bosses" ? (
				<>
					<SortableTable
						rows={bossRows}
						columns={bossColumns}
						rowKey={(row) => row.id}
						gridClass={BOSS_GRID}
						initialSort={{ key: "effective", direction: "desc" }}
					/>
					<p className="text-xs leading-6 text-white/45">
						Effective health accounts for the damage multipliers a boss applies
						to its own hitboxes, so it is the number a rotation has to beat.
					</p>
				</>
			) : null}
		</div>
	);
}
