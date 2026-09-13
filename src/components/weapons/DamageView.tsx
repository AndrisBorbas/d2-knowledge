"use client";

import { useMemo } from "react";

import { AnnotatedText } from "@/components/tooltip/AnnotatedText";
import type {
	KeywordClickPayload,
	KeywordHoverPayload,
} from "@/components/tooltip/types";
import { Button } from "@/components/ui/Button";
import {
	BOSSES_TAB,
	DAMAGE_TAB,
	DPS_SHEET_URL,
	sheetTabUrl,
	SUSTAINED_TAB,
} from "@/lib/aegis/config";
import type {
	AnnotatedEntry,
	Annotation,
	Keyword,
} from "@/lib/compendium/model";
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

// The glossary matcher already ran over the sheet's own prose at build time, so
// the view only has to hand the offsets and the entries to the renderer. Empty
// until the perk bundle arrives, which prints the same sentence unlinked.
export type DamageGlossary = {
	entryMap: Map<string, AnnotatedEntry>;
	keywordById: Map<string, Keyword>;
	annotationsFor: (rowId: string, field: string) => Annotation[];
	onKeywordHover: (payload: KeywordHoverPayload) => void;
	onKeywordLeave: () => void;
	onKeywordClick: (payload: KeywordClickPayload) => void;
};

type DamageViewProps = {
	dataset: WeaponsDataset;
	query: string;
	tab: DamageTab;
	onTabChange: (tab: DamageTab) => void;
	glossary: DamageGlossary;
};

const SHOT_GRID =
	"grid min-w-[44rem] grid-cols-[9rem_minmax(0,1fr)_6rem_6rem_7rem_5rem] items-center gap-3";
const SUSTAINED_GRID =
	"grid min-w-[52rem] grid-cols-[minmax(0,1fr)_5rem_6rem_5rem_6rem_6rem_6rem] items-center gap-3";
const BOSS_GRID =
	"grid min-w-[56rem] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_7rem_6rem_6rem_minmax(0,1fr)] items-center gap-3";

function matches(query: string, ...fields: (string | undefined)[]) {
	const needle = query.trim().toLowerCase();
	if (needle.length === 0) return true;
	return fields.filter(Boolean).join(" ").toLowerCase().includes(needle);
}

// The conditions behind a damage number run to a line and a half, and every
// perk in them is a link, so they get a full width strip under the row rather
// than a column that would truncate half of them out of reach.
function SetupLine({
	rowId,
	blocks,
	glossary,
}: {
	rowId: string;
	// Field name on the row and the text it holds, in reading order. The field
	// is what the build step keyed its offsets by.
	blocks: { field: string; text: string | undefined }[];
	glossary: DamageGlossary;
}) {
	const present = blocks.filter(
		(block) => block.text !== undefined && block.text.length > 0,
	);
	if (present.length === 0) return null;

	return (
		<p className="text-xs leading-5 text-white/55">
			{present.map((block, index) => (
				<span key={block.field}>
					{index > 0 ? <span className="text-white/25"> - </span> : null}
					<AnnotatedText
						text={block.text ?? ""}
						annotations={glossary.annotationsFor(rowId, block.field)}
						entryMap={glossary.entryMap}
						keywordById={glossary.keywordById}
						onKeywordHover={glossary.onKeywordHover}
						onKeywordLeave={glossary.onKeywordLeave}
						onKeywordClick={glossary.onKeywordClick}
						linkClassName="text-xs"
					/>
				</span>
			))}
		</p>
	);
}

export function DamageView({
	dataset,
	query,
	tab,
	onTabChange,
	glossary,
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
			render: (row) => <span className="text-white">{row.name}</span>,
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
						// Null rather than an empty strip, so a row the sheet said
						// nothing about keeps a table row's height.
						renderDetail={(row) =>
							(row.modifiers ?? row.otherTicks) ? (
								<SetupLine
									rowId={row.id}
									blocks={[
										{ field: "modifiers", text: row.modifiers },
										{ field: "otherTicks", text: row.otherTicks },
									]}
									glossary={glossary}
								/>
							) : null
						}
					/>
					<p className="text-xs leading-6 text-white/45">
						Crit and body are the raw numbers a shot prints on a boss in the
						sheet&apos;s test conditions. Normalized scales those to one
						benchmark so two weapons can be compared directly. The conditions
						under each row name what was equipped and how the shot was measured;
						anything the glossary knows about links to its entry.
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
						renderDetail={(row) =>
							(row.loadout ?? row.notes) ? (
								<SetupLine
									rowId={row.id}
									blocks={[
										{ field: "loadout", text: row.loadout },
										{ field: "notes", text: row.notes },
									]}
									glossary={glossary}
								/>
							) : null
						}
					/>
					<p className="text-xs leading-6 text-white/45">
						Each row is one simulated damage rotation with the perks, surges and
						debuffs the sheet names. TtE is time to empty in seconds. The setup
						under each row is the sheet&apos;s own wording, with every perk,
						fragment and buff the glossary knows linked to its entry.
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
