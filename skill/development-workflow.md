# Development workflow

Run commands from the repository root (the directory containing
`package.json`).

## Prerequisites

- Node.js compatible with installed Vite 8.3.4: `^20.19.0 || >=22.12.0`
  (verified from the installed Vite package metadata).
- npm, because the repository includes `package-lock.json` and defines npm
  scripts. A specific npm version is not declared.

## Available commands

| Command | Manifest script | Current status |
|---|---|---|
| `npm run dev` | `vite` | Starts the client application from `index.html`. |
| `npm run build` | `vite build` | Builds the client and copies `public/data/` into `dist/data/`. |
| `npm test` | `node --test` | Runs `tests/database.test.js` with Node's built-in runner. |

`npm ci` can be used to install the exact versions from the lockfile if
dependency installation is needed. Dependencies are already present in the
inspected checkout; installation was not needed for this analysis.

## Recommended change workflow

1. Inspect current source, dataset files, and schema before editing.
2. For collection changes, update [public/data/schema.json](../public/data/schema.json)
   and the relevant collection together. Keep stable IDs and source/reference
   links valid.
3. Run `npm test` to exercise loading, required/type/enum/date constraints,
   relational integrity, ItemsJS search/facets, filtering, sort, paging, URL
   state service behavior, and freshness.
4. Run `npm run build`; verify the emitted `dist/data/*.json` files are present.
5. For UI changes, run `npm run dev` from the repository root and verify the
   rendered page, dynamic facet counts, shareable search URL, back/forward
   behavior, and error states in a browser.
6. Keep any data and test additions grounded in explicit evidence; update
   `database_metadata.json` and the documentation when provenance changes.

The repository has no documented deployment or release workflow. It has no
lint or type-check script.

When changing search behavior, use [search-and-facets.md](./search-and-facets.md)
for the current ItemsJS fields, normalization, and sort/filter semantics.
