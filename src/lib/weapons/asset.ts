// Written by `scripts/minify-dataset.mts` into public/, so the browser can
// fetch the full dataset after the prerendered seed paints.
export const WEAPONS_ASSET_URL = "/assets/data/weapons.min.json";

// The glossary entries behind the recommended perks. Heavier than the weapons
// data and only needed once a row is expanded, so it is fetched on demand
// rather than on mount.
export const WEAPON_PERKS_ASSET_URL = "/assets/data/weapon-perks.min.json";
