# Inzegane Platform: Agent Skill

## Project purpose

This is a small client-side Vite catalogue for wholesale electronics researched
for Inezgane and Souss-Massa. It loads a normalized, static JSON snapshot,
validates its shape and relationships, indexes the joined catalogue with
ItemsJS, and provides searchable, faceted, sortable product listings with
supplier offers and historical observations. It has no server or write path.

`public/data/database_metadata.json` says the records were imported from
`dataBase.md`, but that root document is not present in this checkout.
`Docs/dataBase-01.md` describes a different proposed schema and must not be
treated as the canonical application dataset. The current `public/data/`
collections and `schema.json` are authoritative for implementation. Their
source claims have not been independently verified; never present stale
observations as live price or stock data.

## Start here

- [Architecture](./architecture.md) — browser entry, data loading, validation,
  ItemsJS indexing, query and render flow.
- [Search and facets](./search-and-facets.md) — indexed fields, facet behavior,
  Arabic fallback, sorting, URL state, and extension procedure.
- [Codebase map](./codebase-map.md) — implementation and dataset paths.
- [Data model](./data-model.md) — collections, relationships, provenance and
  known unresolved references.
- [Development workflow](./development-workflow.md) and
  [testing and validation](./testing-and-validation.md) — commands and checks.
- [Coding conventions](./coding-conventions.md) — implementation patterns to
  preserve.
- [Dependencies and integrations](./dependencies-and-integrations.md) —
  runtime/build boundaries.
- [Known limitations](./known-limitations.md) — data and product constraints.

## Safe change procedure

1. Work from the repository root. Keep JSON under `public/data/`; the browser
   fetches it at `${BASE_URL}data/<file>`.
2. For schema/data changes, edit the collection and `schema.json` together,
   then run `npm test`. Preserve stable IDs and every cross-file reference.
   `src/database.js` validates the fetched payload against the JSON Schema and
   checks entity relationships before exposing it to the page.
3. Keep product identity separate from supplier offers. Attach prices,
   quantity tiers, stock claims, and supplier terms to offers, not products.
   Each offer, price observation, and availability check needs valid source
   references.
4. Do not create real-world prices, stock quantities, supplier identities, or
   evidence. If information is missing, preserve explicit `null`, empty
   collections, or the documented unknown status. Update
   `public/data/database_metadata.json` if snapshot provenance changes.
5. Use DOM `textContent` and node creation for data-driven rendering; do not
   interpolate catalogue records into `innerHTML`. Keep load and validation
   failures visible.
6. Re-check price age with `getOfferFreshness` before changing offer display.
   The UI must not present stale prices or availability as current.
7. Search/index changes belong in `src/catalog-search.js`; keep the source
   JSON unchanged and rebuild the ItemsJS index through its `reindex` API when
   a loaded database snapshot changes. Consult [search and facets](./search-and-facets.md)
   before adding indexed fields or filters.

## Commands

Run at the repository root:

- `npm run dev` — Vite development server.
- `npm test` — Node's built-in test runner for database validation and
  ItemsJS-backed catalogue search.
- `npm run build` — production Vite build; copies `public/data/` into `dist/data/`.

`npm run lint` runs ESLint on `src/`; no type-check script is configured. See the
[validation guide](./testing-and-validation.md) for coverage and limitations.
