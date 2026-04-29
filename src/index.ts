// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

/**
 * `@freshjuice/astro-search-plugin` — main entry.
 *
 * Re-exports the framework-agnostic core API so most apps can do:
 *   import { loadIndex, searchIndex } from "@freshjuice/astro-search-plugin";
 *
 * Submodule entries:
 *   /build   — server-side index builder (Node)
 *   /core    — programmatic browser API (no UI)
 *   /element — `<astro-search-palette>` web component (vanilla, Vue, Svelte, Solid…)
 *   /react   — React `<SearchPalette>` / `<SearchBox>` components
 */

export {
  loadIndex,
  searchIndex,
  matchesShortcut,
  groupResults,
  navigateToDocument,
} from "./core.js";

export type { AnyOrama } from "./core.js";
export type {
  BuildIndexConfig,
  SearchDocument,
  SearchOptions,
  SearchResult,
  SearchSchema,
} from "./types.js";
