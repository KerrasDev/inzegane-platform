# Dependencies and integrations

## Declared dependencies

The root [package.json](../package.json) declares:

- `itemsjs` (`^2.4.4`, installed 2.4.4) as a runtime dependency. It is
  imported by [src/catalog-search.js](../src/catalog-search.js) and provides
  the in-memory full-text index, facet filtering/counts, configured sorting,
  and pagination. The app creates its index from validated JSON records and
  does not use ItemsJS as storage or a network service. See
  [search-and-facets.md](./search-and-facets.md) for the exact integration.
- `vite` (`^8.3.4`) as a development dependency and the target of the `dev`
  and `build` scripts. Vite serves `index.html` and copies `public/data/` into
  the production build.

`package-lock.json` uses lockfile version 3 and records the resolved dependency
tree. Keep the manifest and lockfile synchronized if dependencies are
intentionally changed. Do not edit dependency package files under
`node_modules/`.

## Data boundary and configuration

The browser fetches local same-origin static JSON. There is no API server,
database, environment variable, `.env` file, credentials configuration, or
Vite configuration. The UI can generate a WhatsApp `wa.me` confirmation link
from the public contact fields in the dataset; it does not call WhatsApp or
submit any data itself.

Vite 8.3.4 package metadata requires Node `^20.19.0 || >=22.12.0`. The project
does not independently declare an engines field or pin a Node version.

## Adding an integration safely

ItemsJS receives normalized product search documents in memory. It does not
receive or modify the source JSON files, offer terms, or provenance records.
Its index is rebuilt with `reindex` from a complete validated snapshot.
Keep credentials out of source and documentation; do not fabricate values.

The project also creates a WhatsApp `wa.me` confirmation link from public
contact data. It does not call WhatsApp or submit/store any quote request.
