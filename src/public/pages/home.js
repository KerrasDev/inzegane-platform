/**
 * src/public/pages/home.js
 * Inzegane Platform — Homepage (index.html).
 *
 * Keeps the homepage's searchable catalog (and its existing URL parameters)
 * and adds an overview of the dataset with links to the other public pages.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { initCatalogListing } from '../components/catalog-listing.js';
import { el, link } from '../components/dom.js';
import { showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { routes } from '../lib/format.js';

mountSiteLayout('home');

const status = document.querySelector('#load-status');
const overview = document.querySelector('#catalog-overview');
const listing = document.querySelector('#catalog-listing');

function renderOverview(catalog) {
  const stats = [
    ['Products', catalog.products.length, routes.products()],
    ['Categories', catalog.categories.length, routes.categories()],
    ['Suppliers', catalog.suppliers.length, routes.suppliers()],
    ['Recorded offers', catalog.offers.length, routes.offers()],
  ];
  overview.replaceChildren(el('dl', { className: 'stat-grid' }, stats.map(([term, count, href]) => el('div', {}, [
    el('dt', { text: term }),
    el('dd', {}, [link(href, String(count), '', { 'aria-label': `${count} ${term.toLowerCase()} — browse` })]),
  ]))));
  overview.hidden = false;
}

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    renderOverview(catalog);
    initCatalogListing({ container: listing, catalog, pageSize: 6, heading: 'Documented catalog', idPrefix: 'home' });
  } catch (error) {
    showLoadError(status, error, listing);
  }
}

void start();
