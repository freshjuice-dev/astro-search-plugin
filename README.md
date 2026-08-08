# @freshjuice/astro-search-plugin

> ⚠️ PRIVATE REPOSITORY — Proprietary and confidential. See [LICENSE](LICENSE).
> Framework-agnostic, type-safe search for Astro 5+, powered by [Orama]. Build the index at build time, query it client-side, drop in a Cmd+K command palette as a web component (works in Vue, Svelte, Solid, Lit, Preact, vanilla HTML — anywhere), or as a React component. Apache-2.0. No runtime CDN. No telemetry.

[![npm version](https://img.shields.io/npm/v/@freshjuice/astro-search-plugin.svg)](https://www.npmjs.com/package/@freshjuice/astro-search-plugin)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Why this exists

The official [`@orama/plugin-astro`][official] declares `astro: ^2.0.4` as a peer dependency. On Astro 5 / 6 this either fails to install or, with `--legacy-peer-deps`, pulls a shadow copy of Astro 2 alongside your real Astro version — the plugin doesn't actually integrate with your build.

This package fills the gap: a small, focused plugin built on the same Orama core, designed for modern Astro, with explicit TypeScript types and a UI that doesn't lock you into one framework.

## What you get

| | |
|---|---|
| 🔍 **Build-time indexing** | One JSON index built from your content collections, no runtime CDN |
| 🧱 **Framework-agnostic UI** | `<astro-search-palette>` web component works in Astro, Vue, Svelte, Solid, Lit, Preact, vanilla HTML |
| ⚛️ **React adapter** | `<SearchPalette>` / `<SearchBox>` for React-heavy apps that want JSX-native props |
| 🔧 **Programmatic core** | Bring your own UI — `loadIndex` / `searchIndex` / `groupResults` exposed directly |
| 🧩 **Multi-collection search** | Index blog + tools + docs in one go, filter by `type`, `tag`, etc. |
| 🎯 **Faceted filters** | First-class — Orama's `where: { type: 'blog' }` works out of the box |
| 📦 **Tiny client runtime** | ~10kb gzipped + your index JSON (~1-2MB for 250 pages) |
| 🛡️ **No SSR pitfalls** | Components defer Orama load until after hydration |
| 📜 **Apache-2.0** | Full sources, NOTICE attribution to Orama, no telemetry, no signups |

## Install

```bash
npm install @freshjuice/astro-search-plugin
# Astro is the only required peer
npm install astro

# Optional — only if you use the React adapter
npm install react react-dom
```

> Requires Astro 5+. ESM-only. React is a fully optional peer dependency.

## Subpath exports

| Import path | What it ships | When to use |
|---|---|---|
| `@freshjuice/astro-search-plugin` | Type-only + core re-exports | Type imports, programmatic helpers |
| `@freshjuice/astro-search-plugin/build` | `buildSearchIndex` (Node) | In your Astro endpoint, server side |
| `@freshjuice/astro-search-plugin/core` | `loadIndex`, `searchIndex`, `groupResults` … | Build your own UI in any framework |
| `@freshjuice/astro-search-plugin/element` | Registers `<astro-search-palette>` custom element | Vanilla, Astro, Vue, Svelte, Solid, Lit, Preact |
| `@freshjuice/astro-search-plugin/react` | `<SearchPalette>`, `<SearchBox>` React components | React-first projects |
| `@freshjuice/astro-search-plugin/styles.css` | Default stylesheet | Always — used by both `/element` and `/react` |

## Quickstart

### 1. Build the index

Create a static endpoint that emits the index. The plugin gives you the helper —
you decide what gets indexed, from which collection, with what schema.

```ts
// src/pages/search-index.json.ts
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { buildSearchIndex } from "@freshjuice/astro-search-plugin/build";

export const GET: APIRoute = async () => {
  const blog = await getCollection("blog", ({ data }) => !data.draft);
  const tools = await getCollection("tools");

  const index = await buildSearchIndex({
    schema: {
      type: "string",
      title: "string",
      desc: "string",
      url: "string",
      tags: "string[]",
    },
    documents: [
      ...blog.map((p) => ({
        id: p.id,
        type: "blog",
        title: p.data.title,
        desc: p.data.desc,
        url: `/blog/${p.id}/`,
        tags: p.data.tags,
      })),
      ...tools.map((t) => ({
        id: t.id,
        type: "tool",
        title: t.data.title,
        desc: t.data.desc,
        url: `/tools/${t.id}/`,
        tags: [],
      })),
    ],
  });

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
};
```

### 2. Drop the palette into your layout — pick your flavor

#### Vanilla / Astro / any framework — web component

```astro
---
// src/layouts/BaseLayout.astro
import "@freshjuice/astro-search-plugin/styles.css";
---

<html>
  <body>
    <slot />

    <astro-search-palette
      index-url="/search-index.json"
      shortcut="mod+k"
      placeholder="Search…"
      group-by="type"
    ></astro-search-palette>

    <script>
      // Side-effect import: registers <astro-search-palette> globally
      import "@freshjuice/astro-search-plugin/element";
    </script>
  </body>
</html>
```

That's it. **Cmd+K** anywhere on the site opens a search modal.

#### Vue 3

```vue
<template>
  <astro-search-palette
    index-url="/search-index.json"
    placeholder="Search…"
    group-by="type"
  />
</template>

<script setup lang="ts">
import "@freshjuice/astro-search-plugin/element";
import "@freshjuice/astro-search-plugin/styles.css";
</script>
```

#### Svelte

```svelte
<script lang="ts">
  import "@freshjuice/astro-search-plugin/element";
  import "@freshjuice/astro-search-plugin/styles.css";
</script>

<astro-search-palette
  index-url="/search-index.json"
  placeholder="Search…"
  group-by="type"
/>
```

#### React

```tsx
import { SearchPalette } from "@freshjuice/astro-search-plugin/react";
import "@freshjuice/astro-search-plugin/styles.css";

export default function Layout() {
  return (
    <SearchPalette
      indexUrl="/search-index.json"
      placeholder="Search…"
      groupBy="type"
    />
  );
}
```

In Astro, hydrate it with `client:idle` (or `client:load`):

```astro
---
import { SearchPalette } from "@freshjuice/astro-search-plugin/react";
import "@freshjuice/astro-search-plugin/styles.css";
---
<SearchPalette client:idle indexUrl="/search-index.json" />
```

### 3. Open it programmatically

The web component listens to global window events. Open it from anywhere:

```js
window.dispatchEvent(new CustomEvent("astro-search:open"));
window.dispatchEvent(new CustomEvent("astro-search:close"));
window.dispatchEvent(new CustomEvent("astro-search:toggle"));
```

### 4. Override navigation

Listen to the `astro-search:select` event before navigation. Call
`preventDefault()` to take over (e.g. for SPA routing or analytics):

```js
document.querySelector("astro-search-palette").addEventListener(
  "astro-search:select",
  (e) => {
    e.preventDefault();
    myRouter.push(e.detail.document.url);
  },
);
```

In React, pass `onSelect={(doc) => router.push(doc.url)}`.

## API reference

### `<astro-search-palette>` attributes

| Attribute | Default | Description |
|---|---|---|
| `index-url` | — (required) | URL to fetch the serialized index JSON |
| `shortcut` | `"mod+k"` | Keyboard combo. `mod` = ⌘ on macOS, Ctrl elsewhere. Or `"/"`, `"ctrl+k"`, etc. |
| `placeholder` | `"Search..."` | Input placeholder text |
| `result-limit` | `10` | Maximum results returned per query |
| `group-by` | unset | Field name to group results by (e.g. `type`) |

### `<astro-search-palette>` events

| Event | Detail | Cancelable |
|---|---|---|
| `astro-search:open` | — | no — listened to |
| `astro-search:close` | — | no — listened to |
| `astro-search:toggle` | — | no — listened to |
| `astro-search:select` | `{ document }` | **yes** — call `preventDefault()` to override navigation |

### `<SearchPalette>` (React) props

```tsx
interface SearchPaletteProps {
  indexUrl: string;
  shortcut?: string;          // Default: "mod+k"
  placeholder?: string;       // Default: "Search..."
  resultLimit?: number;       // Default: 10
  searchableProperties?: string[];
  filter?: Record<string, unknown>; // Orama where clause
  groupBy?: string;
  renderResult?: (doc: SearchDocument) => ReactNode;
  onSelect?: (doc: SearchDocument) => void;
}
```

### `<SearchBox>` (React)

Standalone search input with inline dropdown — no modal. Useful for sidebar or hero placements.

```tsx
import { SearchBox } from "@freshjuice/astro-search-plugin/react";

<SearchBox indexUrl="/search-index.json" autoFocus />
```

### Programmatic API — `/core`

```ts
import {
  loadIndex,
  searchIndex,
  groupResults,
  matchesShortcut,
  navigateToDocument,
} from "@freshjuice/astro-search-plugin/core";

const db = await loadIndex("/search-index.json");
const results = await searchIndex(db, "what is paid media", {
  limit: 20,
  where: { type: "blog" },
});
```

### `buildSearchIndex(config)` — `/build`

Server-side. Builds an Orama index and serializes it to JSON.

```ts
import { buildSearchIndex, type SearchSchema } from "@freshjuice/astro-search-plugin/build";

const index = await buildSearchIndex({
  schema: SearchSchema,        // Orama schema definition
  documents: SearchDocument[], // your records
  language: "english",         // Default: "english"
});
```

## Styling

Default classes use the `astro-search-` prefix. Override anything by
re-defining them after importing `styles.css`:

```css
.astro-search-modal {
  border-radius: 4px;          /* sharper corners */
  background: var(--my-card);
}
.astro-search-result[data-selected="true"] {
  background: var(--my-accent);
}
```

The bundled stylesheet ships with a `prefers-color-scheme: dark` block — drop it in and dark mode just works.

## How it differs

### vs. `@orama/plugin-astro`

|  | `@freshjuice/astro-search-plugin` | `@orama/plugin-astro` |
|---|---|---|
| Astro support | **5, 6** (current) | 2.x (peer dep `^2.0.4` as of v3.1.18) |
| Source available | **Yes** (this repo) | Source not in their public monorepo at time of writing |
| Build approach | Astro endpoint pattern (you control schema) | Auto-magic build hook |
| TypeScript types | **Strict, exported, schema-typed** | Limited |
| UI | **Web component + React** | React only |
| Bundle size | ~10kb client + ~1MB index | similar |

### vs. Pagefind

[Pagefind] is the de-facto standard for Astro static-site search and powers Astro Starlight. **Use Pagefind if** you want zero-config drop-in search with an opinionated UI, you're indexing a blog/docs site without complex filtering, and you don't need programmatic control. **Use this plugin if** you want type-safe schemas, faceted search out of the box, multi-collection unified results, multiple framework targets, or the option to add vector/hybrid search later.

## Trademark / Affiliation Disclaimer

This package is **not affiliated with, endorsed by, or sponsored by OramaSearch Inc.** "Orama" is a trademark of OramaSearch Inc.; this package references the name solely to describe the search engine it integrates with, under nominative fair use.

For the official Orama Astro integration see [`@orama/plugin-astro`][official]. For the Orama core engine itself see [`@orama/orama`](https://www.npmjs.com/package/@orama/orama).

Huge respect to the Orama team for the excellent core engine.

## Contributing

Issues and PRs welcome. This is an OSS package by FreshJuice, maintained casually but seriously.

```bash
git clone https://github.com/freshjuice-dev/astro-search-plugin.git
cd astro-search-plugin
npm install
npm run build       # Build to dist/
npm run dev         # Watch mode
npm run typecheck   # tsc --noEmit
```

## License

[Apache-2.0](./LICENSE) · See [NOTICE](./NOTICE) for full attributions.

Built by [FreshJuice](https://freshjuice.dev/) — developer studio that ships standards, not products. Free tools, 0 marketing emails, all open source.

[Orama]: https://github.com/oramasearch/orama
[official]: https://www.npmjs.com/package/@orama/plugin-astro
[Pagefind]: https://pagefind.app/
