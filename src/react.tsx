// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

/**
 * React adapter — thin wrapper around the framework-agnostic `core.ts`.
 *
 * For non-React stacks, prefer:
 *   - `@freshjuice/astro-search-plugin/element` — drop-in `<astro-search-palette>` web component
 *   - `@freshjuice/astro-search-plugin/core`    — programmatic API, BYO UI
 */

import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  loadIndex,
  searchIndex,
  matchesShortcut,
  groupResults,
  navigateToDocument,
  type AnyOrama,
  type SearchDocument,
  type SearchResult,
} from "./core.js";

export {
  loadIndex,
  searchIndex,
  matchesShortcut,
  groupResults,
  navigateToDocument,
} from "./core.js";
export type {
  AnyOrama,
  SearchDocument,
  SearchOptions,
  SearchResult,
  SearchSchema,
} from "./core.js";

const SearchIcon = () => (
  <svg
    className="astro-search-icon"
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 256 256"
    fill="currentColor"
  >
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
  </svg>
);

// =============================================================================
// SearchPalette (Cmd+K modal)
// =============================================================================

export interface SearchPaletteProps {
  /** URL to fetch the index JSON from. */
  indexUrl: string;
  /** Keyboard shortcut to open. `mod` = ⌘ on macOS, Ctrl elsewhere. Default: "mod+k" */
  shortcut?: string;
  /** Placeholder text in the input. Default: "Search..." */
  placeholder?: string;
  /** Maximum results to show. Default: 10 */
  resultLimit?: number;
  /** Properties to search within. Default: all string properties */
  searchableProperties?: string[];
  /** Optional faceted filter applied to all queries (Orama `where` clause). */
  filter?: Record<string, unknown>;
  /** If set, group results by this document field (e.g. "type"). */
  groupBy?: string;
  /** Render a custom row for each result. Defaults to title + desc. */
  renderResult?: (doc: SearchDocument) => ReactNode;
  /** Callback when a result is selected. Default: `window.location.href = doc.url` */
  onSelect?: (doc: SearchDocument) => void;
}

export function SearchPalette({
  indexUrl,
  shortcut = "mod+k",
  placeholder = "Search...",
  resultLimit = 10,
  searchableProperties,
  filter,
  groupBy,
  renderResult,
  onSelect = navigateToDocument,
}: SearchPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dbRef = useRef<AnyOrama | null>(null);

  // Global hotkey + custom open/close events
  useEffect(() => {
    const keyHandler = (e: globalThis.KeyboardEvent) => {
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    const openHandler = () => setOpen(true);
    const closeHandler = () => setOpen(false);
    const toggleHandler = () => setOpen((v) => !v);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("astro-search:open", openHandler);
    window.addEventListener("astro-search:close", closeHandler);
    window.addEventListener("astro-search:toggle", toggleHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("astro-search:open", openHandler);
      window.removeEventListener("astro-search:close", closeHandler);
      window.removeEventListener("astro-search:toggle", toggleHandler);
    };
  }, [shortcut, open]);

  // Lazy-load index on first open
  useEffect(() => {
    if (!open) return;
    if (dbRef.current) return;
    setLoading(true);
    loadIndex(indexUrl)
      .then((db) => {
        dbRef.current = db;
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open, indexUrl]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Run search whenever query changes
  useEffect(() => {
    if (!dbRef.current) return;
    let cancelled = false;
    (async () => {
      const hits = await searchIndex(dbRef.current!, query, {
        limit: resultLimit,
        properties: searchableProperties,
        where: filter,
      });
      if (!cancelled) {
        setResults(hits);
        setSelected(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, resultLimit, searchableProperties, filter]);

  const grouped = useMemo(
    () => (groupBy ? groupResults(results, groupBy) : null),
    [results, groupBy],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, Math.max(0, results.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = results[selected];
        if (hit) {
          onSelect(hit.document);
          setOpen(false);
        }
      }
    },
    [results, selected, onSelect],
  );

  if (!open) return null;

  return (
    <div
      className="astro-search-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="astro-search-modal">
        <div className="astro-search-input-wrap">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            className="astro-search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="astro-search-shortcut">esc</kbd>
        </div>

        <ul className="astro-search-results">
          {loading && <li className="astro-search-empty">Loading index…</li>}
          {error && <li className="astro-search-empty">{error}</li>}
          {!loading && !error && query && results.length === 0 && (
            <li className="astro-search-empty">No results for "{query}"</li>
          )}
          {!loading && !error && !query && (
            <li className="astro-search-empty">Start typing to search…</li>
          )}

          {grouped
            ? grouped.map(([groupName, items]) => (
                <li key={groupName}>
                  <div className="astro-search-group-label">{groupName}</div>
                  {items.map((hit) => {
                    const idx = results.indexOf(hit);
                    return (
                      <ResultRow
                        key={hit.id}
                        result={hit}
                        selected={idx === selected}
                        onMouseEnter={() => setSelected(idx)}
                        onClick={() => {
                          onSelect(hit.document);
                          setOpen(false);
                        }}
                        renderResult={renderResult}
                      />
                    );
                  })}
                </li>
              ))
            : results.map((hit, i) => (
                <li key={hit.id}>
                  <ResultRow
                    result={hit}
                    selected={i === selected}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => {
                      onSelect(hit.document);
                      setOpen(false);
                    }}
                    renderResult={renderResult}
                  />
                </li>
              ))}
        </ul>

        <div className="astro-search-footer">
          <span className="astro-search-key">
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span className="astro-search-key">
            <kbd>↵</kbd> open
          </span>
          <span className="astro-search-key">
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  result,
  selected,
  onClick,
  onMouseEnter,
  renderResult,
}: {
  result: SearchResult;
  selected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  renderResult?: (doc: SearchDocument) => ReactNode;
}) {
  const doc = result.document;
  return (
    <button
      type="button"
      className="astro-search-result"
      data-selected={selected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {renderResult ? (
        renderResult(doc)
      ) : (
        <>
          <div className="astro-search-result-title">
            {doc.type !== undefined && (
              <span className="astro-search-result-type">{String(doc.type)}</span>
            )}
            {String(doc.title ?? doc.url)}
          </div>
          {doc.desc !== undefined && (
            <div className="astro-search-result-desc">{String(doc.desc)}</div>
          )}
        </>
      )}
    </button>
  );
}

// =============================================================================
// SearchBox (standalone input with dropdown)
// =============================================================================

export interface SearchBoxProps
  extends Omit<SearchPaletteProps, "shortcut" | "groupBy"> {
  /** Initial focus on mount. Default: false */
  autoFocus?: boolean;
}

export function SearchBox({
  indexUrl,
  placeholder = "Search...",
  resultLimit = 10,
  searchableProperties,
  filter,
  renderResult,
  onSelect = navigateToDocument,
  autoFocus = false,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const dbRef = useRef<AnyOrama | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const ensureLoaded = useCallback(async () => {
    if (dbRef.current) return;
    dbRef.current = await loadIndex(indexUrl);
  }, [indexUrl]);

  useEffect(() => {
    if (!query || !dbRef.current) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const hits = await searchIndex(dbRef.current!, query, {
        limit: resultLimit,
        properties: searchableProperties,
        where: filter,
      });
      if (!cancelled) setResults(hits);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, resultLimit, searchableProperties, filter]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={wrapRef} className="astro-search-box">
      <input
        type="search"
        className="astro-search-box-input"
        placeholder={placeholder}
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          ensureLoaded();
          setOpen(true);
        }}
        autoComplete="off"
        spellCheck={false}
      />
      {open && results.length > 0 && (
        <ul className="astro-search-box-results">
          {results.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="astro-search-result"
                onClick={() => {
                  onSelect(hit.document);
                  setOpen(false);
                }}
              >
                {renderResult ? (
                  renderResult(hit.document)
                ) : (
                  <>
                    <div className="astro-search-result-title">
                      {String(hit.document.title ?? hit.document.url)}
                    </div>
                    {hit.document.desc !== undefined && (
                      <div className="astro-search-result-desc">
                        {String(hit.document.desc)}
                      </div>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
