// Foundry perk descriptions embed inline icon glyphs as classNames instead
// of text (e.g. "arc", "overload"). These maps translate a glyph's className
// to where its icon lives in the Bungie manifest.

// DamageType enum (bungie-api-ts): Kinetic=1, Arc=2, Thermal(Solar)=3,
// Void=4, Raid=5, Stasis=6, Strand=7. Matched by enum value rather than
// display name since "solar"'s internal name is "Thermal".
export const DAMAGE_TYPE_ENUM_BY_GLYPH: Record<string, number> = {
	kinetic: 1,
	arc: 2,
	solar: 3,
	void: 4,
	stasis: 6,
	strand: 7,
};

// DestinyBreakerType enum: ShieldPiercing(Barrier)=1, Disruption(Overload)=2,
// Stagger(Unstoppable)=3.
export const BREAKER_TYPE_ENUM_BY_GLYPH: Record<string, number> = {
	barrier: 1,
	overload: 2,
	unstoppable: 3,
};

// No Bungie definition table exposes ammo types or Guardian classes as
// per-hash icons the way damage/breaker types do, so these come from the
// public/assets/destiny-icons git submodule instead. The "_outline" class
// variants are used (not the plain ones) because the plain ones have no
// fill and render as invisible black glyphs on this app's dark background.
const DESTINY_ICONS_BASE = "/assets/destiny-icons";

export const STATIC_ICON_PATH_BY_GLYPH: Record<string, string> = {
	primary: `${DESTINY_ICONS_BASE}/general/ammo-primary.svg`,
	special: `${DESTINY_ICONS_BASE}/general/ammo-special.svg`,
	heavy: `${DESTINY_ICONS_BASE}/general/ammo-heavy.svg`,
	hunter: `${DESTINY_ICONS_BASE}/general/class_hunter_outline.svg`,
	titan: `${DESTINY_ICONS_BASE}/general/class_titan_outline.svg`,
	warlock: `${DESTINY_ICONS_BASE}/general/class_warlock_outline.svg`,
};

// "Enhanced" trait indicator glyph — not an ability/element/ammo icon, skip.
export const SKIPPED_GLYPH_CLASS_NAMES = new Set(["enhancedArrow"]);
