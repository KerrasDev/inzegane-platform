# Testing and validation

## Automated tests

The project uses Node's built-in test runner in
[tests/database.test.js](../tests/database.test.js). Run `npm test` from the
repository root. Coverage includes successful collection loading, JSON load
failures, schema/integrity validation, ItemsJS initialization/reindexing,
French and Arabic search, combined category/brand/supplier filters, facet
counts, effective offer filters, sorting, pagination, empty/missing fields,
and freshness thresholds.

These are service-level tests: they exercise the ItemsJS response and the
catalogue records mapped from it, not browser DOM rendering or actual history
events. Verify the dynamic facet labels, deep links, back/forward behavior,
and responsive UI in a browser after changes to `src/public/components/catalog-listing.js` or the filters.

## Build and interactive verification

Validation commands must be run from the repository root:

- `npm run build` — runs Vite and copies public JSON files to `dist/data/`.
- `npm run dev` — starts the browser application; verify the catalogue and
  filters in a browser after frontend changes.
- There is no lint, formatting, TypeScript, or type-check command.

The automated suite tests data/query logic rather than DOM rendering. It does
not replace browser checks for visual, accessibility, or interaction behavior.

Add tests for new search fields, facets, matching, sorting, validation, or
freshness behavior in `tests/database.test.js`. Document checks that could not
be run and their blockers; do not report build/test success without executing
the command.
