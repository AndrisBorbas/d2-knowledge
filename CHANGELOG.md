# Changelog

Notable user facing changes to Owl Sector, newest first. Rendered at
[/changelog](https://owlsector.net/changelog) by `src/lib/changelog/parse.ts`,
so keep the shape below: `## [version] - YYYY-MM-DD` (or `## [Unreleased]`),
then `### Added` / `### Changed` / `### Fixed` / `### Removed` /
`### Deprecated` / `### Security`, then plain `-` bullets. Inline `code`,
**bold** and [links](https://owlsector.net) render; nothing else does.

## [1.4.0] - 2026-09-04

### Added

- Weapon perks from the Data Compendium: traits, weapon mods, intrinsic frames,
  origin traits and the crossbow, glaive and sword breakdowns.
- Origin traits show the raid, foundry, season or event they drop from.
- Armor mods from the Data Compendium, filed under the slot they go in, along
  with the raid and activity mods that only fit armor from that activity.
- Armor mods show their energy cost.
- Every glossary filter is now reachable from a `Filters` button, which opens a
  searchable list of them grouped by category.
- Changelog page listing what changed in each release.

### Changed

- Weapon perks are filtered by the Data Compendium's own categories, so every
  origin trait sits under one `Origin Traits` filter instead of being split
  across several.
- Armor set bonuses no longer appear under the `Armor Perks` filter, which now
  holds exotic armor perks and armor mods, and stay under `Armor Sets`.
- Exotic weapon catalysts lead with the perk they grant, so Forerunner's
  catalyst reads `The Rock (Forerunner Catalyst)` and can be searched under
  either name.

### Fixed

- Superseded entries the Data Compendium marks `OLD`, such as the previous
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
