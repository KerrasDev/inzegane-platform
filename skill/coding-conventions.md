# Coding conventions

## Conventions verified in the repository

- `package.json` sets `"type": "module"`. New JavaScript files should use ES
  module syntax unless a concrete compatibility requirement dictates
  otherwise.
- The implementation is plain JavaScript with native DOM APIs; there is no
  framework or component library.
- Source uses named exports for reusable database functions and camelCase
  JavaScript names. JSON keys retain the snake_case names defined by
  `public/data/schema.json`.
- Data-driven UI uses `document.createElement`, `textContent`, and explicit
  attributes. Keep untrusted or unverified record strings out of `innerHTML`.
- Load, parse, HTTP, schema, and relationship failures are reported explicitly;
  do not replace a failed data load with an empty catalogue. Keep search
  documents derived and ephemeral rather than modifying source records.
- CSS lives in `assets/css/main.css`, uses custom properties and class names,
  and includes responsive breakpoints.
- Tests use Node's built-in `node:test` and `node:assert/strict`; no external
  test dependency is needed.
- No formatter/linter configuration or TypeScript/type-check setup is present.

## Guidance for new code

Keep the current browser-only architecture unless a task explicitly requires
more. Use the central loader in `src/database.js` and the ItemsJS service in
`src/catalog-search.js` rather than adding duplicate fetch, relationship, or
search logic. Preserve stale labels and VAT notation when changing offer
rendering.

See [development-workflow.md](./development-workflow.md) for commands and
[testing-and-validation.md](./testing-and-validation.md) for current quality
gaps.
