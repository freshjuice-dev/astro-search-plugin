// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

/**
 * Framework-agnostic core. No DOM, no React, no Vue. Just Orama + small
 * helpers that any UI layer (web component, React, Vue, Svelte, vanilla)
 * can build on.
 */

import { create, load, search } from "@orama/orama";
import type { AnyOrama } from "@orama/orama";
import type { SearchDocument, SearchOptions, SearchResult } from "./types.js";

export type { SearchDocument, SearchOptions, SearchResult, SearchSchema } from "./types.js";
export type { AnyOrama };

// =============================================================================
// Index loader — promise-deduped per URL for the page lifetime
// =============================================================================

const indexCache = new Map<string, Promise<AnyOrama>>();

/**
 * Lazily fetch a serialized Orama index from a URL and restore it in-memory.
 * Calls to the same URL deduplicate; results are cached for the page lifetime.
 */
export async function loadIndex(url: string): Promise<AnyOrama> {
  const cached = indexCache.get(url);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `[@freshjuice/astro-search-plugin] Failed to load index from ${url}: HTTP ${res.status}`,
      );
    }
    const json = await res.json();
    const db = await create({ schema: { __placeholder: "string" } });
    await load(db, json);
    return db;
  })();

  indexCache.set(url, promise);
  return promise;
}

/**
 * Run a query against a loaded Orama database. Returns a list of results in
 * Orama's standard shape.
 */
export async function searchIndex<T extends SearchDocument = SearchDocument>(
  db: AnyOrama,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<T>[]> {
  if (!query.trim()) return [];
  const result = await search(db, {
    term: query,
    properties: options?.properties ?? "*",
    limit: options?.limit ?? 10,
    offset: options?.offset ?? 0,
    where: options?.where,
  });
  return (result.hits ?? []) as unknown as SearchResult<T>[];
}

// =============================================================================
// Keyboard shortcut matcher
// =============================================================================

/**
 * Compare a `KeyboardEvent` against a textual shortcut spec like:
 *   "mod+k"   — `mod` = ⌘ on macOS, Ctrl elsewhere
 *   "ctrl+k"
 *   "meta+k"
 *   "/"       — single-key shortcut
 *
 * Case-insensitive, modifiers in any order.
 */
export function matchesShortcut(
  e: KeyboardEvent,
  raw: string,
  isMac = typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform),
): boolean {
  const parts = raw.toLowerCase().split("+").map((p) => p.trim());
  const wantMod = parts.includes("mod");
  const wantCtrl = parts.includes("ctrl");
  const wantMeta = parts.includes("meta");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  const key = parts.find(
    (p) => !["mod", "ctrl", "meta", "shift", "alt"].includes(p),
  );

  if (key !== undefined && e.key.toLowerCase() !== key) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;

  if (wantMod) {
    return isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  }
  if (wantCtrl) return e.ctrlKey;
  if (wantMeta) return e.metaKey;
  return !e.metaKey && !e.ctrlKey;
}

// =============================================================================
// Result grouping helper
// =============================================================================

/**
 * Group an array of search results by the value of a given document field.
 * Returns an array of `[groupName, results[]]` tuples preserving original order.
 */
export function groupResults<T extends SearchDocument = SearchDocument>(
  results: SearchResult<T>[],
  groupBy: string,
): [string, SearchResult<T>[]][] {
  const map = new Map<string, SearchResult<T>[]>();
  for (const r of results) {
    const key = String((r.document as Record<string, unknown>)[groupBy] ?? "");
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return [...map.entries()];
}

// =============================================================================
// Default click handler — navigates to result.url
// =============================================================================

export function navigateToDocument(doc: SearchDocument): void {
  if (typeof window === "undefined") return;
  window.location.href = doc.url;
}
