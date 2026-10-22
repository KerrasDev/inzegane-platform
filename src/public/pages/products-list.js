/**
 * src/public/pages/products-list.js
 * Inzegane Platform — Products listing page (pages/products/index.html).
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { initCatalogListing } from '../components/catalog-listing.js';
import { showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';

mountSiteLayout('products');

const status = document.querySelector('#load-status');
const listing = document.querySelector('#catalog-listing');

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    initCatalogListing({ container: listing, catalog, pageSize: 9, heading: 'Results', idPrefix: 'products' });
  } catch (error) {
    showLoadError(status, error, listing);
  }
}

void start();
