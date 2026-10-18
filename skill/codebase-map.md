# Codebase map

All paths below are relative to the repository root.

| Path | Current contents / role |
|---|---|
| `package.json` | Project metadata, module mode, dependencies, and npm scripts. |
| `package-lock.json` | npm lockfile, lockfile version 3. |
| `Docs/dataBase-01.md` | Existing research/proposal document. Its proposed schema differs from the running app's schema; do not use its records as canonical without explicit reconciliation. |
| `index.html` | Browser page and Vite application entry. |
| `src/main.js` | UI startup, controls, safe DOM rendering, loading/error states. |
| `src/database.js` | Static JSON loader, schema/integrity/date validation, catalogue relationship resolution and freshness logic. |
| `src/catalog-search.js` | ItemsJS index construction, searchable field normalization, facets, sorting, pagination and result-to-catalogue mapping. |
| `public/data/schema.json` | JSON Schema for the aggregate collections object. |
| `public/data/categories.json` | 12 product categories with parent links. |
| `public/data/brands.json` | 10 brand records. |
| `public/data/suppliers.json` | 5 documented suppliers and their categories/source references. |
| `public/data/products.json` | 7 canonical product records, including localized names/specifications. |
| `public/data/offers.json` | 8 supplier-specific offers and quantity tiers. |
| `public/data/price_history.json` | 6 dated price observations. |
| `public/data/availability_checks.json` | 5 dated availability observations. |
| `public/data/sources.json` | 8 source/evidence records. |
| `public/data/research_summary.json` | Snapshot counts, coverage, and research notes from the source. |
| `public/data/database_metadata.json` | Import provenance and explicit independent-verification status. |
| `assets/css/main.css` | Responsive catalogue styling. |
| `tests/database.test.js` | Node tests for loading, validation, freshness, ItemsJS search/facets, sorting, reindexing and paging. |
| `data/` | Existing empty directory; the Vite-served JSON lives in `public/data/`. |
| `assets/images/`, `assets/js/` | Present but currently unused/empty. |
| `node_modules/` | Installed dependencies in this checkout; generated dependency tree, not project source. |

No root `dataBase.md` is present in this checkout, despite that name being
recorded as the import source in database metadata. No README, Vite config,
environment file, lint configuration, or type-check configuration is present.

## Where to implement

Put browser behavior in `src/`, static browser data in `public/data/`, and
styles in `assets/css/`. Keep loading, validation, and relationship resolution
in `src/database.js`; put search fields/facets and ItemsJS behavior in
`src/catalog-search.js`. Do not scatter fetches across components or edit
installed dependencies in `node_modules/`.

## Important package metadata

`package.json` still has `"main": "index.js"`, but no root `index.js` exists.
The current browser app is built from `index.html`; the package `main` metadata
is unused by the Vite application.
