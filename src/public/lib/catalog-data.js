/**
 * src/public/lib/catalog-data.js
 * Inzegane Platform — Public catalog loader.
 *
 * Public pages read the static JSON catalog through the existing read-only
 * catalogDataService (JsonCatalogProvider). The snapshot is fetched once per
 * page load and cached by the provider.
 */

import { catalogDataService } from '../../data/database-service.js';
import { buildPublicCatalog } from './catalog-index.js';

let catalogPromise = null;

export function loadPublicCatalog() {
  if (!catalogPromise) {
    catalogPromise = catalogDataService.getSnapshot()
      .then((database) => buildPublicCatalog(database))
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}
