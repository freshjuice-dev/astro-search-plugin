// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

import { create, insertMultiple, save } from "@orama/orama";
import type { BuildIndexConfig, SearchSchema } from "./types.js";

export type { BuildIndexConfig, SearchSchema, SearchDocument } from "./types.js";

/**
 * Build a serializable Orama search index from a list of documents and a schema.
 *
 * Intended to run inside an Astro endpoint (`src/pages/<name>.json.ts`)
 * during the static build, so the result is emitted as a static JSON file
 * that the client can `fetch()` once and query in-memory.
 *
 * @example
 * ```ts
 * // src/pages/search-index.json.ts
 * import { getCollection } from "astro:content";
 * import { buildSearchIndex } from "@freshjuice/astro-search-plugin/build";
 *
 * export const GET = async () => {
 *   const posts = await getCollection("blog");
 *   const index = await buildSearchIndex({
 *     schema: { title: "string", desc: "string", url: "string" },
 *     documents: posts.map(p => ({
 *       id: p.id, url: `/blog/${p.id}/`, title: p.data.title, desc: p.data.desc,
 *     })),
 *   });
 *   return new Response(JSON.stringify(index));
 * };
 * ```
 */
export async function buildSearchIndex<S extends SearchSchema>(
  config: BuildIndexConfig<S>,
): Promise<unknown> {
  const { schema, documents, language = "english" } = config;

  const db = await create({
    // Orama's compile-time schema types are very strict (literal "string" |
    // "number" | …); we accept a runtime string map and let Orama validate.
    schema: schema as unknown as Parameters<typeof create>[0]["schema"],
    components: { tokenizer: { language } },
  });

  if (documents.length > 0) {
    // Cast: SearchDocument is intentionally permissive ([key: string]: unknown);
    // Orama validates at runtime against the schema we just supplied.
    await insertMultiple(db, documents as Parameters<typeof insertMultiple>[1]);
  }

  return await save(db);
}
