# Changelog

All notable changes to `@freshjuice/astro-search-plugin` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-05-02

### Fixed
- `<astro-search-palette>` lost input focus after the first keystroke. The component re-rendered the entire modal on every search, destroying the `<input>` element so the second character had nowhere to land. Split rendering into `renderShell()` (called on open/close) and `renderResults()` (called on each query) so the input keeps its focus and selection while typing. The React adapter was unaffected.

## [1.0.0] — 2026-04-29

Initial public release. Tested end-to-end against Astro 6 + React 19 powering search across the [freshjuice.dev](https://freshjuice.dev/) site (93 documents — blog posts, tools, authors).

### Added

**Server-side**
- `buildSearchIndex({ schema, documents, language? })` — builds an Orama index and serializes it to JSON. Use it inside an Astro endpoint (`src/pages/search-index.json.ts`).

**Client core (framework-agnostic)**
- `loadIndex(url)` — fetches a serialized index, restores it in-memory. Promise-deduped per URL.
- `searchIndex(db, query, options)` — runs a query against a loaded index.
- `matchesShortcut(event, "mod+k")` — keyboard combo matcher (`mod` = ⌘ on macOS, Ctrl elsewhere).
- `groupResults(results, fieldName)` — group-by helper for typed result lists.
- `navigateToDocument(doc)` — default click handler.

**Web component (`/element`)**
- `<astro-search-palette>` custom element. Drop-in Cmd+K palette that works in vanilla HTML, Astro `.astro` files, Vue, Svelte, Solid, Lit, Preact, React — anywhere custom elements render.
- Attributes: `index-url`, `shortcut`, `placeholder`, `result-limit`, `group-by`.
- Events: `astro-search:open` / `:close` / `:toggle` (window-level) and `astro-search:select` (cancelable, lets you take over navigation).
- Idempotent registration via `defineSearchPalette()` — safe to import multiple times.

**React adapter (`/react`)**
- `<SearchPalette>` — Cmd+K modal with keyboard navigation (`↑/↓`, `Enter`, `Esc`), grouping by document field, custom render function, lazy index load on first open.
- `<SearchBox>` — standalone search input with inline dropdown.
- Thin layer over `/core` — no duplicated logic.

**Styling**
- `@freshjuice/astro-search-plugin/styles.css` — default stylesheet with `astro-search-*` class prefix. Built-in dark mode via `prefers-color-scheme`.
- Search icon: inline Phosphor `magnifying-glass` SVG (no emoji).

**Build & types**
- ESM-only build via tsup. Strict TypeScript types exported from every entry.
- Subpath exports: `.`, `./build`, `./core`, `./element`, `./react`, `./styles.css`.
- React peers fully optional — non-React users install zero React deps.
- Apache-2.0 license, NOTICE attribution to OramaSearch Inc.

### Notes
- Tested against Astro 5 and 6, React 18 and 19.
- Index for ~100 documents weighs ~250–300 KB serialized JSON.

[1.0.1]: https://github.com/freshjuice-dev/astro-search-plugin/releases/tag/v1.0.1
[1.0.0]: https://github.com/freshjuice-dev/astro-search-plugin/releases/tag/v1.0.0
