// Two community spreadsheets, both maintained by @theaegisrelic. The endgame
// sheet rates weapons and spells out the archetype math; the DPS sheet holds
// the measured damage numbers. Neither is ours, so the site credits both.
export const ENDGAME_SHEET_ID = "1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY";
export const ENDGAME_SHEET_NAME = "Destiny 2: Endgame Analysis";
export const ENDGAME_SHEET_URL = `https://docs.google.com/spreadsheets/d/${ENDGAME_SHEET_ID}/edit`;

export const DPS_SHEET_ID = "1_5wtBjRYHHxuF4oJKDb_iOGZs-wTkzB6RYbnyNLbuz4";
export const DPS_SHEET_NAME = "Boss DPS Spreadsheet";
export const DPS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DPS_SHEET_ID}/edit`;

export const SHEET_AUTHOR = "@theaegisrelic";

export function sheetTabUrl(sheetUrl: string, gid: number) {
	return `${sheetUrl}#gid=${gid}`;
}

// Where the real header sits and where the data starts, per tab. Guessing is
// not safe: the tier tabs put a column-group banner above the header, while
// Status and Sustained start with the header itself.
export type TabLayout = {
	tab: string;
	gid: number;
	bannerRow?: number;
	headerRow: number;
	dataStartRow: number;
	// Deliberately below the observed count, so a normal week of edits does not
	// trip it but a gutted or renamed tab does.
	minRows: number;
};

export type WeaponTierTab = TabLayout & {
	// What the tab covers, spelled out for a reader.
	weaponType: string;
	slug: string;
	// How the Archetypes tab spells the same weapon, so a rated weapon can be
	// joined to its frame's damage math. Undefined where the tab mixes types.
	archetypeWeapon?: string;
};

const tierLayout = { bannerRow: 0, headerRow: 1, dataStartRow: 2 } as const;

// Ordered the way the sheet orders its tabs, which is roughly primary, then
// special, then heavy.
export const WEAPON_TIER_TABS: WeaponTierTab[] = [
	{
		...tierLayout,
		tab: "Autos",
		gid: 1890042119,
		weaponType: "Auto Rifle",
		slug: "auto-rifles",
		archetypeWeapon: "Auto rifle",
		minRows: 30,
	},
	{
		...tierLayout,
		tab: "Bows",
		gid: 324500912,
		weaponType: "Bow",
		slug: "bows",
		archetypeWeapon: "Bow",
		minRows: 12,
	},
	{
		...tierLayout,
		tab: "HCs",
		gid: 1315046624,
		weaponType: "Hand Cannon",
		slug: "hand-cannons",
		archetypeWeapon: "Hand cannon",
		minRows: 30,
	},
	{
		...tierLayout,
		tab: "Pulses",
		gid: 1712537582,
		weaponType: "Pulse Rifle",
		slug: "pulse-rifles",
		archetypeWeapon: "Pulse rifle",
		minRows: 30,
	},
	{
		...tierLayout,
		tab: "Scouts",
		gid: 946843299,
		weaponType: "Scout Rifle",
		slug: "scout-rifles",
		archetypeWeapon: "Scout rifle",
		minRows: 24,
	},
	{
		...tierLayout,
		tab: "Sidearms",
		gid: 1594008157,
		weaponType: "Sidearm",
		slug: "sidearms",
		archetypeWeapon: "Sidearm",
		minRows: 20,
	},
	{
		...tierLayout,
		tab: "SMGs",
		gid: 1405969509,
		weaponType: "Submachine Gun",
		slug: "smgs",
		archetypeWeapon: "SMG",
		minRows: 24,
	},
	{
		...tierLayout,
		tab: "BGLs",
		gid: 657764751,
		weaponType: "Breech Grenade Launcher",
		slug: "breech-grenade-launchers",
		archetypeWeapon: "Grenade launcher - breech",
		minRows: 16,
	},
	{
		...tierLayout,
		tab: "Fusions",
		gid: 1318165198,
		weaponType: "Fusion Rifle",
		slug: "fusion-rifles",
		archetypeWeapon: "Fusion rifle",
		minRows: 20,
	},
	{
		...tierLayout,
		tab: "Glaives",
		gid: 1239299765,
		weaponType: "Glaive",
		slug: "glaives",
		archetypeWeapon: "Glaive",
		minRows: 6,
	},
	{
		...tierLayout,
		tab: "Shotguns",
		gid: 1595979957,
		weaponType: "Shotgun",
		slug: "shotguns",
		archetypeWeapon: "Shotgun",
		minRows: 30,
	},
	{
		...tierLayout,
		tab: "Snipers",
		gid: 1090554564,
		weaponType: "Sniper Rifle",
		slug: "sniper-rifles",
		archetypeWeapon: "Sniper rifle",
		minRows: 28,
	},
	{
		...tierLayout,
		// Rocket sidearms are Micro-Missile sidearms as far as the archetype math
		// is concerned, which is where that tab files them.
		tab: "Rocket Sidearms",
		gid: 550485113,
		weaponType: "Rocket Sidearm",
		slug: "rocket-sidearms",
		archetypeWeapon: "Sidearm",
		minRows: 4,
	},
	{
		...tierLayout,
		tab: "Traces",
		gid: 288998351,
		weaponType: "Trace Rifle",
		slug: "trace-rifles",
		archetypeWeapon: "Trace rifle",
		minRows: 6,
	},
	{
		...tierLayout,
		tab: "HGLs",
		gid: 439751986,
		weaponType: "Heavy Grenade Launcher",
		slug: "heavy-grenade-launchers",
		archetypeWeapon: "Grenade launcher - drum",
		minRows: 12,
	},
	{
		...tierLayout,
		tab: "LFRs",
		gid: 29008106,
		weaponType: "Linear Fusion Rifle",
		slug: "linear-fusion-rifles",
		archetypeWeapon: "Linear fusion rifle",
		minRows: 10,
	},
	{
		...tierLayout,
		tab: "LMGs",
		gid: 1919916707,
		weaponType: "Machine Gun",
		slug: "machine-guns",
		archetypeWeapon: "Machine gun",
		minRows: 18,
	},
	{
		...tierLayout,
		tab: "Rockets",
		gid: 981030684,
		weaponType: "Rocket Launcher",
		slug: "rocket-launchers",
		archetypeWeapon: "Rocket launcher",
		minRows: 16,
	},
	{
		...tierLayout,
		tab: "Swords",
		gid: 473850359,
		weaponType: "Sword",
		slug: "swords",
		archetypeWeapon: "Sword",
		minRows: 20,
	},
	{
		...tierLayout,
		// A catch-all for weapons that sit outside their own tab's ranking, so it
		// holds several weapon types at once and joins to no single archetype.
		tab: "Other",
		gid: 266663572,
		weaponType: "Other",
		slug: "other",
		minRows: 4,
	},
];

export const EXOTICS_TAB: TabLayout = {
	tab: "Exotic Weapons",
	gid: 1789798057,
	headerRow: 1,
	dataStartRow: 2,
	minRows: 120,
};

export const ARCHETYPES_TAB: TabLayout = {
	tab: "Archetypes",
	gid: 1301036036,
	bannerRow: 0,
	headerRow: 1,
	dataStartRow: 2,
	minRows: 80,
};

export const STATUS_TAB: TabLayout = {
	tab: "Status",
	gid: 346832350,
	headerRow: 0,
	dataStartRow: 1,
	minRows: 20,
};

// Fetched only for the tier legend printed in its KEY columns, which is the
// sheet's own wording for what S through F mean.
export const PERKS_TAB: TabLayout = {
	tab: "Perks",
	gid: 1589555995,
	headerRow: 1,
	dataStartRow: 2,
	minRows: 100,
};

export const DAMAGE_TAB: TabLayout = {
	tab: "Weapons",
	gid: 2139128689,
	bannerRow: 0,
	headerRow: 1,
	dataStartRow: 2,
	minRows: 300,
};

export const SUSTAINED_TAB: TabLayout = {
	tab: "Sustained",
	gid: 1455724279,
	headerRow: 0,
	dataStartRow: 1,
	minRows: 180,
};

export const BOSSES_TAB: TabLayout = {
	tab: "Bosses",
	gid: 1346678363,
	bannerRow: 0,
	headerRow: 1,
	dataStartRow: 2,
	minRows: 40,
};

export const ENDGAME_TABS: TabLayout[] = [
	STATUS_TAB,
	ARCHETYPES_TAB,
	PERKS_TAB,
	EXOTICS_TAB,
	...WEAPON_TIER_TABS,
];

export const DPS_TABS: TabLayout[] = [DAMAGE_TAB, SUSTAINED_TAB, BOSSES_TAB];

export const TIER_RANKS = ["S", "A", "B", "C", "D", "E", "F"] as const;
export type TierRank = (typeof TIER_RANKS)[number];

export const ENERGY_TYPES = [
	"Kinetic",
	"Arc",
	"Solar",
	"Void",
	"Stasis",
	"Strand",
] as const;
export type EnergyType = (typeof ENERGY_TYPES)[number];

// The tier tabs and the Archetypes tab do not always spell a frame the same
// way. Only genuine spelling differences belong here: a frame the Archetypes
// tab simply does not cover (exotic intrinsics like MIDA Synergy) should miss
// the join and be reported, not be mapped onto a neighbour.
export const ARCHETYPE_FRAME_ALIASES: Record<string, string> = {
	Rapid: "Rapid-Fire",
	"Rapid Slug": "Rapid-Fire Slug",
};
