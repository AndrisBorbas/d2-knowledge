# Changelog

Notable user facing changes to Owl Sector, newest first. Rendered at
[/changelog](https://owlsector.net/changelog) by `src/lib/changelog/parse.ts`,
so keep the shape below: `## [version] - YYYY-MM-DD` (or `## [Unreleased]`),
then `### Added` / `### Changed` / `### Fixed` / `### Removed` /
`### Deprecated` / `### Security`, then plain `-` bullets. Inline `code`,
**bold** and [links](https://owlsector.net) render; nothing else does.

## [1.6.0] - 2026-09-08

### Added

- Abilities page at [/abilities](https://owlsector.net/abilities): every super, ability, aspect and fragment a class can equip, per subclass, laid out the way the game groups them, with each section marked as class specific or shared across all three classes.
- Aspects show how many fragment slots they grant, and fragments show their stat bonuses and penalties.
- Movement abilities, so jumps like `Triple Jump` and `Strafe Glide` now appear in the glossary alongside the other abilities.

### Fixed

- Hover frames no longer get clipped inside scrolling areas: the settings dialog, the pinned tooltips drawer and the filter chip strip on narrow screens.

## [1.5.1] - 2026-09-08

### Fixed

- PvE and PvP damage number coloring with suffixes like `0.95x`.

## [1.5.0] - 2026-09-08

### Added

- Exotic Class Item perks from DDC.
- Class abilities from DDC, with base cooldown and chunk scalar.
- Each class's passive traits.

### Changed

- Consolidated some Filters and Categories for entries.

### Fixed

- Grenades are no longer filed under `Hunter` alone, since all three classes
  share them.
- `Silence & Squall`, `Slicewire`, `Handheld Supernova`, `Ward of Dawn` and
  `Hammer of Sol` now show their in-game description and icon, which the game
  files spell differently enough that they were being missed.
- Superseded Compendium rows marked `OLDEST` are hidden like the `OLD` ones,
  so they no longer double up beside the live entry.
- PvE and PvP damage numbers are colored in the cases that used to be missed:
  thousands separators (`1,440`), small equations (`634 + 127 = 761`,
  `1,440 x 2`), stack counts (`x17+4.5`), approximations (`~35`), unknown
  values (`64?`, `100?%`) and the nested form `1,280 [2,000] [448 [700]]`.
- Brackets that hold prose rather than damage, such as `[Reload]`,
  `[Redacted]` and `[2–3 Energy]`, are no longer colored as PvP values.
- The `[PVE]` and `[PVP]` headings that label a list of values are colored to
  match the side they introduce.

## [1.4.0] - 2026-09-04

### Added

- Weapon perks from DDC: traits, weapon mods, intrinsic frames,
  origin traits and the crossbow, glaive and sword breakdowns.
- Origin traits show the raid, foundry, season or event they drop from.
- Armor mods from DDC, filed under the slot they go in, along
  with the raid and activity mods that only fit armor from that activity.
- Armor mods show their energy cost.
- Every glossary filter is now reachable from a `Filters` button, which opens a
  searchable list of them grouped by category.
- Changelog page listing what changed in each release.

### Changed

- Weapon perks are filtered by DDC's own categories, so every
  origin trait sits under one `Origin Traits` filter instead of being split
  across several.
- Armor set bonuses no longer appear under the `Armor Perks` filter, which now
  holds exotic armor perks and armor mods, and stay under `Armor Sets`.
- Exotic weapon catalysts lead with the perk they grant, so Forerunner's
  catalyst reads `The Rock (Forerunner Catalyst)` and can be searched under
  either name.

### Fixed

- Superseded entries DDC marks `OLD`, such as the previous
  `Well of Radiance` and `Unbreakable`, no longer sit beside the current ones.
- Fragments and abilities keep their stat and cooldown line when Clarity
  supplies the description.
- A fragment that changes no stats no longer shows a bare `-` above its
  description.
- An entry no longer highlights its own name in its own description, so
  `Bolt Charge` stops opening the card you are already reading.
- Ordinary words that happen to share a name with a minor mod, such as the
  `edge` of a blast radius or being `surrounded` by combatants, no longer
  highlight.
- Stat names and longer perk names keep their meaning instead of linking to a
  shorter one hiding inside them, so `Flinch Resistance` no longer opens the
  `Resistance` chest mod.

## [1.3.4] - 2026-08-27

### Added

- Ordering and toggling of extra infos
