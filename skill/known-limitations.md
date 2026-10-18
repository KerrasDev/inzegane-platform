# Known limitations and open questions

These findings describe the repository inspected for this guide. Re-check
before relying on them after other changes.

## Data provenance and integrity caveats

The metadata at [public/data/database_metadata.json](../public/data/database_metadata.json)
names `dataBase.md` as the import source, but that root file is absent from
this checkout. [Docs/dataBase-01.md](../Docs/dataBase-01.md) is present and
describes a different proposed schema; it does not match the current JSON
model. The dataset metadata explicitly says records have not been
independently verified. Database validation establishes JSON shape and
relationships, not the truth of market claims, contacts, prices, stock,
legal/tax assertions, or source authenticity.

## Remaining limitations

- **All observations are historical:** the snapshot was generated on
  2025-02-21. As of the current implementation, all offers are past their
  freshness threshold and the UI marks them historical. Reconfirm before any
  commercial use.
- **No runtime persistence:** the app is read-only and static; user submissions
  and merchant quote reports are not stored or validated by an administrator.
- **Unresolved location references:** availability records contain
  `location_id` values, but no locations collection or schema is provided.
  Values remain opaque IDs; the app does not fabricate a location table.
- **Source claims unverified:** `sources.json` transcribes source entries from
  the report; URLs and claimed field/portal evidence have not been checked.
- **Document inconsistencies:** narrative coverage mentions national
  distribution via Disway while the summary says zero national suppliers.
  The implementation preserves the source summary rather than reconciling
  undocumented semantics.
- **Validation scope:** the runtime implements the JSON Schema keywords used
  by this schema plus domain relationship/date checks; it is not a general
  JSON Schema Draft 2020-12 validator.
- **Test scope:** automated tests cover loader, validation, query, and
  freshness functions, not the full UI. Browser verification remains necessary
  for rendering and interaction changes.
- **Arabic search:** ItemsJS' bundled Lunr tokenizer does not index
  Arabic-script tokens. The search service uses normalized token-substring
  matching for Arabic-containing queries, then constrains ItemsJS by matching
  IDs. It does not provide Arabic stemming, transliteration, or typo tolerance.
- **Client-side indexing:** the entire JSON snapshot is downloaded and indexed
  in the browser. The current seven-product snapshot is small; no production-
  scale benchmark or server-side search exists.
- **Price sorting:** latest-observation date is not a price comparison. No
  price-range facet is provided because currency, VAT basis, quantity tier,
  and price basis are not normalized across offers.
- **No quality configuration:** no lint, formatting, or type-check scripts or
  configuration are present.
- **Entry metadata mismatch:** `package.json` names `index.js` as `main`, but
  that file is absent. Vite builds the browser app from `index.html`, so the
  `main` field currently has no demonstrated consumer.
- **Deployment unknown:** no hosting, caching, or release procedure is
  documented. Confirm host support for the Vite static output and correct
  base-path configuration before deployment.

## Questions future work must resolve

- Which dated source records/contact details can be independently reverified?
- Should `location_id` become a normalized location collection, and what
  evidence-backed display fields belong there?
- How should the report's national supplier coverage contradiction be
  resolved by its owner?
- What deployment target/base path and operational refresh workflow are
  intended?
- Should supplier or offer search eventually use a server-side index if the
  static catalogue outgrows browser indexing?
