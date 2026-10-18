# Data model

## Implemented storage

The application is a static JSON data browser; it has no server, database
engine, or runtime write path. Vite serves the files in
[public/data/](../public/data), and [src/database.js](../src/database.js)
loads and validates them before the UI can query them.

The aggregate described by `schema.json` contains:

| Collection | Count in this snapshot | Key relationships |
|---|---:|---|
| `categories` | 12 | Optional `parent_id` refers to category. |
| `brands` | 10 | Products refer by `identity.brand_id`. |
| `suppliers` | 5 | Supplier categories and provenance IDs. |
| `products` | 7 | Category path, brand, provenance; one record per canonical product. |
| `offers` | 8 | Each offer binds one product to one supplier and its wholesale terms. |
| `price_history` | 6 | Offer, product, supplier, and source IDs. |
| `availability_checks` | 5 | Product, supplier, and source IDs; opaque `location_id`. |
| `sources` | 8 | Evidence records with `supports` IDs. |
| `research_summary` | 1 object | Snapshot methodology, counts, evidence distribution, and coverage. |

`schema.json` defines required fields, basic JSON types, enums, and references.
The runtime validator also checks unique IDs, references, category ancestry,
price-history consistency with its offer, and ISO-shaped date fields.

## Provenance and freshness

[database_metadata.json](../public/data/database_metadata.json) records that
the declared import source is `dataBase.md`, the import date, snapshot date,
and `independently_verified: false`. The root source document is absent from
this checkout. [Docs/dataBase-01.md](../Docs/dataBase-01.md) contains a
different proposed model and must not be treated as the source for these
records. Claims and source records remain unverified by this project.

Offer freshness is computed from `last_verified_at` (or `observed_at` when
missing), not written back into the JSON:

- 0–7 days: fresh.
- 8 days through the per-category limit: review.
- Beyond the limit: stale. Mobile accessories use 14 days, refurbished laptops
  21 days, and other categories 30 days.
- Missing/invalid/future observation date: unknown.

The UI labels stale prices as last documented, warns that stock/pricing are
not confirmed, and offers a request-to-confirm link if the source lists a
WhatsApp contact. Price history and stock counts are shown as dated historical
observations. The “Dernier prix documenté” sort orders products by the date of
their latest valid, non-future price observation (newest first), not by price
amount; products without such an observation follow, ordered by name. This is a
recency sort, not a current-price or cheapest-offer comparison.

The ItemsJS index is transient and derived from these records; it does not
change the stored data model. Indexed fields, facet semantics, and search
normalization are described in [search-and-facets.md](./search-and-facets.md).

## When adding data features

Preserve stable IDs, source traceability, and the product-versus-offer
separation when changing the dataset. Update `schema.json` with collection
changes and add relationship tests. Do not invent location entities for the
currently opaque `location_id` values without evidence. Keep large datasets
static and same-origin; adding writes or live integrations requires a separate
architecture decision.

See [dependencies-and-integrations.md](./dependencies-and-integrations.md)
for the status of declared dependencies and [known-limitations.md](./known-limitations.md)
for unresolved architecture.
