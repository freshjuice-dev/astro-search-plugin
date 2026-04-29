// Copyright 2026 Alex Zappa / FreshJuice
// SPDX-License-Identifier: Apache-2.0

/**
 * Orama-compatible field schema. The keys you put here become the searchable
 * / filterable properties of your documents.
 *
 * Each value is one of Orama's primitive type tags:
 *   "string" | "number" | "boolean" | "string[]" | "number[]" | "boolean[]"
 *   | "enum" | "enum[]" | "vector[<size>]" | "geopoint"
 *
 * See Orama's docs for full type options:
 * https://docs.oramasearch.com/open-source/usage/create
 */
export type SearchSchema = Record<string, string>;

/**
 * A document to be indexed. `id` and `url` are required for navigation; everything
 * else must match the keys you declared in your `SearchSchema`.
 */
export interface SearchDocument {
  id: string;
  url: string;
  [key: string]: unknown;
}

/**
 * A search hit returned from the client-side query.
 */
export interface SearchResult<T extends SearchDocument = SearchDocument> {
  id: string;
  score: number;
  document: T;
}

/**
 * Configuration accepted by `buildSearchIndex`.
 */
export interface BuildIndexConfig<S extends SearchSchema = SearchSchema> {
  /** Orama schema. Keys define searchable / filterable properties. */
  schema: S;
  /** Records to index. Must satisfy the declared schema. */
  documents: SearchDocument[];
  /** Default language for stemming/tokenization. Defaults to "english". */
  language?: string;
}

/**
 * Configuration for `searchIndex` queries.
 */
export interface SearchOptions {
  /** Maximum number of results. Default: 10 */
  limit?: number;
  /** Properties to search within. Default: all string properties */
  properties?: string[] | "*";
  /** Faceted filters (Orama `where` clause). */
  where?: Record<string, unknown>;
  /** Result offset for pagination. */
  offset?: number;
}
