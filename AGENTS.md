<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Use bun as package manager and runtime.

Don't try to inspect in browser, dev server is running, i'll check changes.

Do not use em dashes ever.

Use radix ui primitives where appropriate, but do not use any other UI libraries. You can use tailwindcss for styling.

# Changelog

Every change a visitor can notice gets a bullet in `CHANGELOG.md`, written as
part of that change, not afterwards. The file is rendered at `/changelog` by
`src/lib/changelog/parse.ts`.

- Add it at the top, under `## [Unreleased]`. Create that heading if the file
  does not have one. Never invent a version number or a date: release headings
  are written by hand at publish time.
- Group it under `### Added`, `### Changed`, `### Fixed`, `### Removed`,
  `### Deprecated` or `### Security`. Reuse the heading if Unreleased already
  has it instead of opening a second one.
- One sentence, present tense, describing what the user sees, not how it was
  built. "Glossary filters survive a reload" beats "moved filter state to nuqs".
- Skip anything invisible on the site: refactors, dependency bumps, data
  snapshot refreshes, tooling, types, tests.
- Only inline `code`, **bold**, _italic_ and [links](https://owlsector.net)
  render. No nested lists, images, code fences or headings inside a bullet.
