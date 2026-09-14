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
	SWAP_TAB,
} from "@/lib/aegis/config";
import type {
	AnnotatedEntry,
	Annotation,
	Keyword,
} from "@/lib/compendium/model";
import {
	cellSortValue,
	formatCell,
	isPerShotRow,
	measuredBoss,
	measuredCell,
} from "@/lib/weapons/display";
import type {
	BossRow,
	DamageShotRow,
	SustainedRow,
	SwapRow,
	WeaponsDataset,
} from "@/lib/weapons/model";

import { SheetCredit } from "./SheetCredit";
import { SortableTable, type TableColumn } from "./SortableTable";
import { WeaponIcon } from "./WeaponIcon";

const DAMAGE_TABS = [
	["shots", "Per shot"],
	["sustained", "Sustained DPS"],
	["swap", "Swap DPS"],
	["bosses", "Boss health"],
] as const;

export type DamageTab = (typeof DAMAGE_TABS)[number][0];

// Per shot is parked rather than deleted. Its rows are measured against two
// different bosses under conditions that run from a single bullet to a whole
// magazine, so no ordering of that column is a ranking, and nothing short of
// splitting it per target and per rotation would make one. The tab still
// renders, so re-listing it here is all it takes to bring it back.
const HIDDEN_DAMAGE_TABS = new Set<DamageTab>(["shots"]);

const VISIBLE_DAMAGE_TABS = DAMAGE_TABS.filter(
	([key]) => !HIDDEN_DAMAGE_TABS.has(key),
);

// The keys the URL is allowed to name, so `?d=shots` falls back to the default
// tab instead of reaching a tab with no button.
export const VISIBLE_DAMAGE_TAB_KEYS = VISIBLE_DAMAGE_TABS.map(([key]) => key);

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
	"grid min-w-[66rem] grid-cols-[9rem_minmax(0,1fr)_6rem_6rem_5rem_6rem_7rem_7rem_4rem_5rem] items-center gap-3";
const SUSTAINED_GRID =
	"grid min-w-[55rem] grid-cols-[2.75rem_minmax(0,1fr)_5rem_6rem_5rem_6rem_6rem_6rem] items-center gap-3";
const SWAP_GRID =
	"grid min-w-[59rem] grid-cols-[2.75rem_minmax(0,1fr)_5rem_5rem_4rem_6rem_5rem_5rem_6rem_6rem] items-center gap-3";
const BOSS_GRID =
	"grid min-w-[68rem] grid-cols-[minmax(0,0.2fr)_minmax(0,0.16fr)_7rem_7rem_5rem_6rem_6rem_minmax(0,0.3fr)_minmax(0,0.4fr)] items-center gap-3";

// `Phase` is seconds on most rows but the sheet also writes "Variable", "N/A"
// and "?" where it never timed one, so the column sorts on the number when
// there is one and sinks the rest the way every numeric cell here does.
function phaseSortValue(phase: string | undefined) {
	const parsed = Number.parseFloat(phase ?? "");
	return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

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
		<p className="text-xs leading-5 text-white/60">
			{present.map((block, index) => (
				<span key={block.field}>
					{index > 0 ? <span className="text-white/45"> - </span> : null}
					<AnnotatedText
						text={block.text ?? ""}
						annotations={glossary.annotationsFor(rowId, block.field)}
						entryMap={glossary.entryMap}
						keywordById={glossary.keywordById}
						onKeywordHover={glossary.onKeywordHover}
						onKeywordLeave={glossary.onKeywordLeave}
						onKeywordClick={glossary.onKeywordClick}
						linkClassName="text-xs align-middle text-white/85"
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

	const swapRows = useMemo(
		() =>
			dataset.swaps.filter((row) =>
				matches(query, row.name, row.loadout, row.attackType),
			),
		[dataset.swaps, query],
	);

	const bossRows = useMemo(
		() =>
			dataset.bosses.filter((row) =>
				matches(
					query,
					row.boss,
					row.activity,
					row.species,
					row.mechanics,
					...row.mods,
				),
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
			// The sheet derives this from the two columns to its left, so it is
			// printed rather than recomputed: a frame whose crit and body shots
			// were measured on different bosses would not divide out to it.
			key: "critRatio",
			label: "Crit x",
			align: "right",
			sortValue: (row) => cellSortValue(row.critRatio),
			render: (row) => formatCell(row.critRatio),
		},
		{
			// Which target the measured value was fired at, because Carl and
			// Savathun take damage differently enough that two rows tested on
			// different ones cannot be put beside each other.
			key: "boss",
			label: "Boss",
			sortValue: (row) => measuredBoss(row) ?? "",
			render: (row) => measuredBoss(row) ?? "-",
		},
		{
			// Split in two rather than printed as one column, because the sheet
			// puts both in the same one and they are not the same quantity: only
			// the left one can be read across rows.
			key: "perShot",
			label: "Per shot",
			align: "right",
			sortValue: (row) =>
				isPerShotRow(row)
					? cellSortValue(measuredCell(row))
					: Number.NEGATIVE_INFINITY,
			render: (row) =>
				isPerShotRow(row) ? formatCell(measuredCell(row)) : "-",
		},
		{
			key: "testTotal",
			label: "Test total",
			align: "right",
			sortValue: (row) =>
				isPerShotRow(row)
					? Number.NEGATIVE_INFINITY
					: cellSortValue(measuredCell(row)),
			render: (row) =>
				isPerShotRow(row) ? "-" : formatCell(measuredCell(row)),
		},
		{
			// The sheet's own count of what it averaged over, so a reader can see
			// whether a number is one reading or the mean of ninety.
			key: "shots",
			label: "Shots",
			align: "right",
			sortValue: (row) => cellSortValue(row.shots),
			render: (row) => formatCell(row.shots),
		},
		{
			key: "patch",
			label: "Patch",
			align: "right",
			sortValue: (row) => row.patch ?? "",
			render: (row) => row.patch ?? "-",
		},
	];

	const sustainedColumns: TableColumn<SustainedRow>[] = [
		{
			// Same match as the swap tab: the weapon the row is named after, or
			// the ability, or whatever the conditions name in brackets where the
			// row is named after a frame.
			key: "icon",
			label: "",
			leading: true,
			render: (row) => (
				<WeaponIcon
					name={row.name}
					iconPath={row.iconPath}
					watermarkPath={row.watermarkPath}
					className="size-11"
				/>
			),
		},
		{
			key: "name",
			label: "Setup",
			sortValue: (row) => row.name,
			render: (row) => <span className="text-white">{row.name}</span>,
		},
		{
			key: "slot",
			label: "Slot",
			sortValue: (row) => row.slot ?? "",
			render: (row) => row.slot ?? "-",
		},
		{
			key: "family",
			label: "Family",
			sortValue: (row) => row.family ?? "",
			render: (row) => row.family ?? "-",
		},
		{
			key: "tte",
			label: "TtE",
			align: "right",
			sortValue: (row) => cellSortValue(row.timeToEmpty),
			render: (row) => formatCell(row.timeToEmpty),
		},
		{
			key: "base",
			label: "Base",
			align: "right",
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

	const swapColumns: TableColumn<SwapRow>[] = [
		{
			// The sheet draws an icon here that no export carries, so it is matched
			// out of the manifest by name. A super or a grenade is not a weapon and
			// gets the lettered square instead.
			key: "icon",
			label: "",
			leading: true,
			render: (row) => (
				<WeaponIcon
					name={row.name}
					iconPath={row.iconPath}
					watermarkPath={row.watermarkPath}
					className="size-11"
				/>
			),
		},
		{
			key: "name",
			label: "Source",
			sortValue: (row) => row.name,
			render: (row) => <span className="text-white">{row.name}</span>,
		},
		{
			// The sheet's `Type`, which is the shape of the attack rather than the
			// slot it comes from: the tab times supers and abilities too.
			key: "attackType",
			label: "Type",
			sortValue: (row) => row.attackType ?? "",
			render: (row) => row.attackType ?? "-",
		},
		{
			key: "base",
			label: "Base",
			align: "right",
			sortValue: (row) => cellSortValue(row.base),
			render: (row) => formatCell(row.base),
		},
		{
			key: "shots",
			label: "Shots",
			align: "right",
			sortValue: (row) => cellSortValue(row.shots),
			render: (row) => formatCell(row.shots),
		},
		{
			key: "total",
			label: "Total",
			align: "right",
			sortValue: (row) => cellSortValue(row.total),
			render: (row) => formatCell(row.total),
		},
		{
			key: "swapTime",
			label: "Swap s",
			align: "right",
			sortValue: (row) => cellSortValue(row.swapTime),
			render: (row) => formatCell(row.swapTime),
		},
		{
			key: "totalTime",
			label: "Total s",
			align: "right",
			sortValue: (row) => cellSortValue(row.totalTime),
			render: (row) => formatCell(row.totalTime),
		},
		{
			key: "swapDps",
			label: "Swap DPS",
			align: "right",
			sortValue: (row) => cellSortValue(row.swapDps),
			render: (row) => (
				<span className="font-semibold text-sky-200">
					{formatCell(row.swapDps)}
				</span>
			),
		},
		{
			key: "trueDps",
			label: "True DPS",
			align: "right",
			sortValue: (row) => cellSortValue(row.trueDps),
			render: (row) => formatCell(row.trueDps),
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
			key: "phase",
			label: "Phase",
			align: "right",
			sortValue: (row) => phaseSortValue(row.phase),
			render: (row) =>
				row.phase
					? isNaN(parseFloat(row.phase))
						? row.phase
						: `${row.phase} s`
					: "N/A",
		},
		{
			key: "clearable",
			label: "Clear DPS",
			align: "right",
			sortValue: (row) => cellSortValue(row.clearableDps),
			render: (row) => formatCell(row.clearableDps),
		},
		{
			key: "onePhase",
			label: "1 phase",
			align: "right",
			sortValue: (row) => cellSortValue(row.onePhaseDps),
			render: (row) => formatCell(row.onePhaseDps),
		},
		{
			// "No" is the sheet's own wording for an activity that has no raid
			// mods, so it is printed as written rather than blanked.
			key: "mods",
			label: "Mods",
			sortValue: (row) => row.mods.join(", "),
			render: (row) => (
				<span title={row.mods.join(", ")}>{row.mods.join(", ") || "-"}</span>
			),
		},
		{
			key: "notes",
			label: "Notes",
			render: (row) => {
				const text =
					[row.onePhaseDescription, row.notes].filter(Boolean).join(" - ") ||
					"-";
				return <span title={text === "-" ? undefined : text}>{text}</span>;
			},
		},
	];

	const layout =
		tab === "shots"
			? DAMAGE_TAB
			: tab === "sustained"
				? SUSTAINED_TAB
				: tab === "swap"
					? SWAP_TAB
					: BOSSES_TAB;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{VISIBLE_DAMAGE_TABS.map(([key, label]) => (
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
				tabUrl={sheetTabUrl(DPS_SHEET_URL, layout.gid)}
				tabLabel={layout.tab}
			/>

			{tab === "shots" ? (
				<>
					<p className="text-xs leading-6 text-white/45">
						Crit and body are the raw numbers a shot prints on a boss in the
						sheet&apos;s test conditions, and Crit x is the ratio between them.
						<br />
						Damage is the damage of the full rotation if shots is one, or the
						per shot damage if shots is more than one. It is only meant to be
						compared with similar weapons. not across weapon types or frames.
						<br />
						Boss is the target the value was measured against, and the two are
						not interchangeable: Carl tests stack Full Throttle x100 while
						Savathun tests use surges.
					</p>
					<SortableTable
						rows={shotRows}
						columns={shotColumns}
						rowKey={(row) => row.id}
						gridClass={SHOT_GRID}
						initialSort={{ key: "perShot", direction: "desc" }}
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
				</>
			) : null}

			{tab === "sustained" ? (
				<>
					<p className="text-xs leading-6 text-white/45">
						Each row is one simulated damage rotation with the perks, surges and
						debuffs the sheet names.
						<br />
						TtE is time to empty in seconds.
					</p>
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
				</>
			) : null}

			{tab === "swap" ? (
				<>
					<p className="text-xs leading-6 text-white/45">
						Each row is one burst timed end to end, so it covers swapping the
						weapon out as well as firing it.
						<br />
						Swap s is the window itself and Total s adds whatever the rotation
						waits out afterwards, which is why a super or a lingering rocket
						drops between Swap DPS and True DPS.
					</p>
					<SortableTable
						rows={swapRows}
						columns={swapColumns}
						rowKey={(row) => row.id}
						gridClass={SWAP_GRID}
						initialSort={{ key: "swapDps", direction: "desc" }}
						renderDetail={(row) =>
							row.loadout ? (
								<SetupLine
									rowId={row.id}
									blocks={[{ field: "loadout", text: row.loadout }]}
									glossary={glossary}
								/>
							) : null
						}
					/>
				</>
			) : null}

			{tab === "bosses" ? (
				<>
					<p className="text-xs leading-6 text-white/45">
						Effective health accounts for the damage multipliers a boss applies
						to its own hitboxes, so it is the number a rotation has to beat.
						<br />
						Phase is how many seconds of damage one window gives you, and Mods
						names the raid mods the activity offers that can affect damage, or
						&quot;No&quot; where it offers none.
						<br />1 phase DPS is the avarage DPS required per player to kill the
						boss in one phase, assuming full fireteam for that activity.
					</p>
					<SortableTable
						rows={bossRows}
						columns={bossColumns}
						rowKey={(row) => row.id}
						gridClass={BOSS_GRID}
						initialSort={{ key: "effective", direction: "desc" }}
					/>
				</>
			) : null}
		</div>
	);
}
