// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

/**
 * `<astro-search-palette>` — framework-agnostic Cmd+K command palette web
 * component. Works in vanilla HTML, Astro, Vue, Svelte, Solid, Lit, Preact,
 * React — anywhere custom elements render.
 *
 * @example
 * ```html
 * <link rel="stylesheet" href="/_static/styles.css" />
 * <astro-search-palette
 *   index-url="/search-index.json"
 *   shortcut="mod+k"
 *   placeholder="Search..."
 *   group-by="type"
 * ></astro-search-palette>
 *
 * <script type="module" src="/_static/element.js"></script>
 * ```
 *
 * @example Programmatically open
 * ```js
 * window.dispatchEvent(new CustomEvent("astro-search:open"));
 * ```
 *
 * @event astro-search:open    — open the palette
 * @event astro-search:close   — close the palette
 * @event astro-search:toggle  — toggle the palette
 * @event astro-search:select  — fired before navigation. `event.detail = { document }`. Call `preventDefault()` to handle navigation yourself.
 */

import {
  loadIndex,
  searchIndex,
  matchesShortcut,
  groupResults,
  type AnyOrama,
  type SearchResult,
} from "./core.js";

const TAG_NAME = "astro-search-palette";

const escapeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export class SearchPaletteElement extends HTMLElement {
  static get observedAttributes() {
    return [
      "index-url",
      "shortcut",
      "placeholder",
      "result-limit",
      "group-by",
    ];
  }

  // State
  private db: AnyOrama | null = null;
  private dbPromise: Promise<AnyOrama> | null = null;
  private query = "";
  private results: SearchResult[] = [];
  private selectedIndex = 0;
  private isOpen = false;

  // Bound listeners — kept as fields so we can detach in disconnectedCallback
  private onWindowKeydown = (e: KeyboardEvent) => this.handleGlobalKey(e);
  private onOpen = () => this.show();
  private onClose = () => this.hide();
  private onToggle = () => this.toggle();

  // Public API
  show() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.ensureLoaded();
    this.render();
    requestAnimationFrame(() => {
      this.querySelector<HTMLInputElement>("input[type='search']")?.focus();
    });
  }
  hide() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.query = "";
    this.results = [];
    this.selectedIndex = 0;
    this.render();
  }
  toggle() {
    this.isOpen ? this.hide() : this.show();
  }

  // Lifecycle
  connectedCallback() {
    window.addEventListener("keydown", this.onWindowKeydown);
    window.addEventListener("astro-search:open", this.onOpen);
    window.addEventListener("astro-search:close", this.onClose);
    window.addEventListener("astro-search:toggle", this.onToggle);
    this.render();
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this.onWindowKeydown);
    window.removeEventListener("astro-search:open", this.onOpen);
    window.removeEventListener("astro-search:close", this.onClose);
    window.removeEventListener("astro-search:toggle", this.onToggle);
  }
  attributeChangedCallback() {
    if (this.isOpen) this.render();
  }

  // Helpers
  private get attr() {
    return {
      indexUrl: this.getAttribute("index-url") ?? "",
      shortcut: this.getAttribute("shortcut") ?? "mod+k",
      placeholder: this.getAttribute("placeholder") ?? "Search...",
      resultLimit: parseInt(this.getAttribute("result-limit") ?? "10", 10),
      groupBy: this.getAttribute("group-by") ?? undefined,
    };
  }

  private async ensureLoaded() {
    if (this.db || this.dbPromise) return;
    if (!this.attr.indexUrl) return;
    this.dbPromise = loadIndex(this.attr.indexUrl);
    try {
      this.db = await this.dbPromise;
      this.render();
    } catch (e) {
      console.error("[astro-search-palette]", e);
    }
  }

  private async runSearch() {
    if (!this.db) return;
    this.results = await searchIndex(this.db, this.query, {
      limit: this.attr.resultLimit,
    });
    this.selectedIndex = 0;
    this.render();
  }

  private handleGlobalKey(e: KeyboardEvent) {
    if (matchesShortcut(e, this.attr.shortcut)) {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (this.isOpen && e.key === "Escape") {
      e.preventDefault();
      this.hide();
    }
  }

  private handleInputKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIndex = Math.min(
        this.selectedIndex + 1,
        Math.max(0, this.results.length - 1),
      );
      this.updateSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.selectCurrent();
    }
  };

  private updateSelection() {
    this.querySelectorAll<HTMLElement>(".astro-search-result").forEach(
      (el, idx) => {
        el.dataset.selected = String(idx === this.selectedIndex);
      },
    );
  }

  private selectCurrent() {
    const hit = this.results[this.selectedIndex];
    if (!hit) return;
    const detail = { document: hit.document };
    const cancelable = this.dispatchEvent(
      new CustomEvent("astro-search:select", { detail, cancelable: true }),
    );
    if (cancelable) {
      // No listener prevented default — navigate
      window.location.href = hit.document.url;
    }
    this.hide();
  }

  private render() {
    if (!this.isOpen) {
      this.innerHTML = "";
      return;
    }

    const { placeholder, groupBy } = this.attr;
    const grouped = groupBy ? groupResults(this.results, groupBy) : null;

    this.innerHTML = /* html */ `
      <div class="astro-search-backdrop" role="dialog" aria-modal="true" aria-label="Search">
        <div class="astro-search-modal">
          <div class="astro-search-input-wrap">
            <svg class="astro-search-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
              <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
            </svg>
            <input type="search" class="astro-search-input"
                   placeholder="${escapeHtml(placeholder)}"
                   autocomplete="off" spellcheck="false" />
            <kbd class="astro-search-shortcut">esc</kbd>
          </div>
          <ul class="astro-search-results">${this.renderResults(grouped)}</ul>
          <div class="astro-search-footer">
            <span class="astro-search-key"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span class="astro-search-key"><kbd>↵</kbd> open</span>
            <span class="astro-search-key"><kbd>esc</kbd> close</span>
          </div>
        </div>
      </div>
    `;

    // Wire up handlers (event delegation off the root for click/mouseenter)
    const backdrop = this.querySelector(".astro-search-backdrop");
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) this.hide();
    });

    const input = this.querySelector<HTMLInputElement>(".astro-search-input")!;
    input.value = this.query;
    input.addEventListener("input", () => {
      this.query = input.value;
      void this.runSearch();
    });
    input.addEventListener("keydown", this.handleInputKey);

    this.querySelectorAll<HTMLButtonElement>(".astro-search-result").forEach(
      (btn, i) => {
        btn.addEventListener("click", () => {
          this.selectedIndex = i;
          this.selectCurrent();
        });
        btn.addEventListener("mouseenter", () => {
          this.selectedIndex = i;
          this.updateSelection();
        });
      },
    );
  }

  private renderResults(
    grouped: [string, SearchResult[]][] | null,
  ): string {
    if (!this.db && this.dbPromise) {
      return `<li class="astro-search-empty">Loading index…</li>`;
    }
    if (!this.query) {
      return `<li class="astro-search-empty">Start typing to search…</li>`;
    }
    if (this.results.length === 0) {
      return `<li class="astro-search-empty">No results for "${escapeHtml(this.query)}"</li>`;
    }
    if (grouped) {
      return grouped
        .map(([name, items]) => {
          const groupHtml = items
            .map((hit) =>
              this.renderRow(hit, this.results.indexOf(hit)),
            )
            .join("");
          return `<li>
            <div class="astro-search-group-label">${escapeHtml(name)}</div>
            ${groupHtml}
          </li>`;
        })
        .join("");
    }
    return this.results
      .map((hit, i) => `<li>${this.renderRow(hit, i)}</li>`)
      .join("");
  }

  private renderRow(hit: SearchResult, idx: number): string {
    const doc = hit.document;
    const type =
      doc.type !== undefined
        ? `<span class="astro-search-result-type">${escapeHtml(String(doc.type))}</span>`
        : "";
    const desc =
      doc.desc !== undefined
        ? `<div class="astro-search-result-desc">${escapeHtml(String(doc.desc))}</div>`
        : "";
    return `<button type="button" class="astro-search-result" data-selected="${idx === this.selectedIndex}">
      <div class="astro-search-result-title">${type}${escapeHtml(String(doc.title ?? doc.url))}</div>
      ${desc}
    </button>`;
  }
}

/**
 * Idempotent registration. Safe to import multiple times.
 * Call manually if you need to register under a different tag name.
 */
export function defineSearchPalette(tagName = TAG_NAME) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SearchPaletteElement);
  }
}

// Auto-define on import
defineSearchPalette();

// Augment HTMLElementTagNameMap so TS knows about <astro-search-palette>
declare global {
  interface HTMLElementTagNameMap {
    "astro-search-palette": SearchPaletteElement;
  }
}
