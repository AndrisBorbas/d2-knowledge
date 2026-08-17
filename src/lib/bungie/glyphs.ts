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

// Bungie's own manifest descriptions spell their inline icons as bracketed
// tokens ("[Solar]", "[Shield-Piercing]") instead of Clarity's classNames.
// Keys here are the token text lowercased with every run of non-alphanumeric
// characters collapsed to a single space; values are the glyph classNames the
// maps above already understand. Tokens with no entry (e.g. "[Grenade]") keep
// their word and just lose the brackets.
export const GLYPH_CLASS_NAME_BY_BUNGIE_TOKEN: Record<string, string> = {
	kinetic: "kinetic",
	arc: "arc",
	solar: "solar",
	void: "void",
	stasis: "stasis",
	strand: "strand",
	"shield piercing": "barrier",
	disruption: "overload",
	stagger: "unstoppable",
	"primary weapon": "primary",
	"special weapon": "special",
	"heavy weapon": "heavy",
};

// Bracketed "[###DestinyNamedSubstitutions.<key>###]" tokens are Bungie's
// dynamic input prompts — the actual button/verb shown in-game depends on the
// player's platform (keyboard vs. Xbox vs. PlayStation), which the manifest
// text can't tell us. Each entry here supplies a static stand-in: either a
// literal replacement string, or an icon (pulled from the manifest via
// `resolveGlyphIcon`, same as the damage/breaker glyphs above, or from a
// static asset path). Add entries as new keys turn up in fetched
// descriptions — an unlisted key falls back to a readable version of itself
// (see `buildOfficialDescription`) instead of the raw "###...###" text.
export type NamedSubstitutionReplacement =
	| { text: string }
	| { iconPath: string; label: string };

export const NAMED_SUBSTITUTION_BY_TOKEN: Record<
	string,
	NamedSubstitutionReplacement
> = {
	ui_player_action_interact_button: { text: "[Interact]" },
	ui_player_action_interact_verb: { text: "Hold" },
	ui_player_action_melee_uncharged_button: { text: "[Melee]" },
	ui_player_action_melee_uncharged_verb: { text: "Press" },
};
