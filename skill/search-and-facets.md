# ItemsJS search and facets

## Integration boundary

The app uses the installed `itemsjs@2.4.4` runtime dependency as its
client-side search and faceted-query engine. It is not a data store or a
supplier synchronization service. The JSON files under
[public/data/](../public/data) remain the source of truth.

[src/database.js](../src/database.js) validates the fetched JSON and
`buildCatalogProducts` resolves product, category, brand, supplier, offer,
source, price-history, and availability-history relationships. After load,
[src/catalog-search.js](../src/catalog-search.js) builds one transient index
from those joined product records. It does not mutate the source JSON.
`createCatalogSearch` constructs the ItemsJS instance once; its `reindex`
method replaces indexed documents when a new validated snapshot is supplied.
The UI calls this service and does not access ItemsJS internals.

The implementation uses the installed package's public APIs:
`itemsjs(data, configuration)`, `search(options)`, and `reindex(data)`.
Search returns `data.items`, `pagination`, and facet aggregation buckets.
ItemsJS provides full-text indexing, facet aggregation/filtering, sorting, and
pagination; the application prepares records, normalizes text, maps IDs back
to display records, and synchronizes browser URL state.

## Search document and normalization

Each temporary index record has a stable `id` equal to `product_id` and
contains:

- French, English, Arabic, and Darija product names; model, SKU, GTIN, and
  original name from the product identity.
- Brand and category names/identifiers, including category ancestors.
- Supplier names in French, English/default, and Arabic where supplied.
- Scalar technical specifications, variants, and packaging terms.

Text is normalized for matching only: Unicode diacritics are removed, Arabic
tatweel is removed, alef variants map to alef, alif-maqsura maps to ya, and
text is lowercased. Original display records remain unchanged. ItemsJS uses
its bundled Lunr full-text implementation with exact-search mode, avoiding
the English stemmer and stop-word filter.

Lunr's tokenizer does not index Arabic-script tokens in this installed
integration. For a query containing Arabic characters, the service performs
normalized token-substring matching against its prepared text and passes
matching stable IDs to ItemsJS using its documented `ids` search option.
ItemsJS still performs the selected facets, sort, pagination, counts, and
result assembly. This fallback is not transliteration, typo tolerance, or
Arabic stemming.

## Facets and result semantics

The configured facets are:

| Facet | Indexed values | Meaning |
|---|---|---|
| Category | Every category ID in the product's category path | Selecting a parent includes products in descendant categories. |
| Brand | Product `identity.brand_id` | One value per product. |
| Supplier | Supplier IDs attached to the product's offers | A product matches if it has an offer from that supplier. |
| Condition | Product condition | Uses the product record's declared condition. |
| Offer verification age | Freshness statuses computed from its offers | A product matches if any offer has the selected status. |
| Effective availability | Effective stock statuses from its offers | Stale/unknown offers are indexed as `unknown`, not as available or out of stock. |

Facets are combined across fields as AND conditions. Values within an
individual facet use OR semantics. The controls show bucket counts from the
current ItemsJS response; zero-count choices are disabled unless selected.
When supplier, freshness, or availability is selected, the returned product
card contains only the matching offers. Without those filters, all of that
product's offers are displayed.

No price-range facet is exposed. The snapshot does not guarantee comparable
currency, tax inclusion, quantity tier, or price basis across offers.

## Sorting, pagination, and URL state

- `name` sorts by normalized French product name, then stable product ID.
- `price` sorts by the latest valid, non-negative, non-future dated price
  observation timestamp, newest first, then by name and ID. It does **not**
  compare price amounts or establish that an offer is current.
- `verified` sorts by the latest non-future `last_verified_at` (or
  `observed_at`) across a product's offers, newest first, then by name and ID.
  It is a documentation-age sort, not proof that an offer remains valid.
- Page size is bounded to 1–50; invalid sort values use name order, and
  requested pages are clamped to the available page range.
- Query, facets, sort, and page use URL parameters (`q`, `category`, `brand`,
  `supplier`, `condition`, `freshness`, `stock`, `sort`, and `page`). Reload,
  back, and forward navigation restore the form state.

## Extending the index

1. Verify that the field is in the validated source schema and has useful
   values in real records. Do not infer missing business facts.
2. Add the normalized field to `toSearchDocument` and to `searchableFields`
   or `AGGREGATIONS` in [src/catalog-search.js](../src/catalog-search.js).
3. If adding a filter, pass its selected value in `search()` and connect the
   corresponding ItemsJS buckets to the UI in [src/main.js](../src/main.js).
   Keep offer-level selections reflected in which offers the card displays.
4. Add tests in [tests/database.test.js](../tests/database.test.js) for
   indexing, matching/filter semantics, counts, sorting, and empty/missing
   values; update URL state handling if the facet is shareable.
5. Run `npm test` and `npm run build` from the project root.

## Scale and limitations

This checkout has seven products and about 72 KB of JSON under `public/data/`.
A local Node measurement on this snapshot built the index in about 33 ms and
ran 50 small searches in about 160 ms; these are indicative only, not
production benchmarks. The app downloads the complete static snapshot and
builds indexes in the browser. Re-measure with representative larger data
before scaling.
There is no incremental record update API in this app; call `reindex` with a
complete validated snapshot. Use a backend search service only if measured
dataset size or latency justifies a separate architecture.
