# Architecture

## Runtime flow

```text
index.html
  └── src/public/pages/home.js
        └── src/public/components/catalog-listing.js
        ├── src/database.js
        │     ├── fetch public/data/schema.json
        │     ├── fetch the nine collection JSON files + database_metadata.json
        │     ├── schema/type/date validation + ID/relationship validation
        │     └── buildCatalogProducts (resolve offers, sources, and histories)
        ├── src/catalog-search.js
        │     ├── normalize joined product records for indexing
        │     ├── ItemsJS full-text index, facets, sort, and pagination
        │     └── application-level Arabic-script query matching via ItemsJS IDs
        └── renders accessible product/offer/history cards
              └── assets/css/main.css
```

There is no server-side runtime, write path, route framework, or persistent
database. Vite serves the source entry and copies the contents of `public/` to
the build output. The browser directly fetches static files; its Vite base URL
is passed into the loader.

## Module responsibilities

- [src/public/components/catalog-listing.js](../src/public/components/catalog-listing.js)
  (used by the homepage, products page, and category detail) connects search/facet/
  sort controls and URL state, displays load failures, and renders products
  and associated offers, provenance, price history, and stock history.
- [src/database.js](../src/database.js) fetches JSON with explicit error
  reporting, validates against the shipped schema, checks stable IDs and
  relationships, calculates offer freshness, and resolves a product's
  supplier offers and observation histories.
- [src/catalog-search.js](../src/catalog-search.js) builds a transient
  normalized search document for each joined product, initializes ItemsJS,
  applies search/facets/sort/pagination, and maps result IDs back to the
  original display records.
- [public/data/](../public/data) contains the source snapshot, schema, and
  provenance sidecar. The app does not edit these files at runtime.
- [index.html](../index.html) is the Vite entry; CSS is in
  [assets/css/main.css](../assets/css/main.css).

```text
package.json
├── runtime dependency: itemsjs (in-memory product search/facet index)
└── development dependency: vite
    ├── dev server
    └── production build of index.html + public/
```

Search document fields and semantics are in [search-and-facets.md](./search-and-facets.md).
The data model and current provenance caveats are detailed in
[data-model.md](./data-model.md) and [known-limitations.md](./known-limitations.md).

## Public website pages

All public pages load `assets/css/public.css` (ITCSS cascade without admin
components) and one entry module from `src/public/pages/`. Each module calls
`mountSiteLayout()` (shared header, navigation, search, footer) and reads data
once through `loadPublicCatalog()` (`src/public/lib/catalog-data.js`), which
wraps the read-only `catalogDataService` and builds relationship maps with
`buildPublicCatalog()` (`src/public/lib/catalog-index.js`).

| URL | Module |
|---|---|
| `/` | `home.js` (catalog search; keeps `q`, `category`, `brand`, `supplier`, `condition`, `freshness`, `stock`, `sort`, `page`) |
| `/pages/products/` | `products-list.js` (same parameters) |
| `/pages/products/detail.html?id=PRODUCT_ID` | `product-detail.js` |
| `/pages/categories/` | `categories.js` |
| `/pages/categories/detail.html?id=CATEGORY_ID` | `category-detail.js` |
| `/pages/suppliers/` | `suppliers.js` (`q`, `city`, `category`) |
| `/pages/suppliers/detail.html?id=SUPPLIER_ID` | `supplier-detail.js` |
| `/pages/offers/` | `offers.js` (`q`, `supplier`, `category`, `type`, `vat`, `freshness`, `sort`, `page`) |
| `/pages/offers/detail.html?id=OFFER_ID` | `offer-detail.js` |
| `/pages/about.html`, `/pages/methodology.html` | `about.js`, `methodology.js` |
| `/pages/contact.html`, `/pages/not-found.html` | `static-page.js` |

Detail identifiers are validated with `parseResourceId()`; unknown or invalid
IDs render an in-page "not found" state (HTTP status stays 200 because the
host serves the static detail page). Unknown paths return
`pages/not-found.html` with HTTP 404 in `vite`/`vite preview` (plugin in
`vite.config.js`) and on Netlify (`netlify.toml` redirect rule).
