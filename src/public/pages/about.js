/**
 * src/public/pages/about.js
 * Inzegane Platform — About page: adds dataset counts derived from the data.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { el, link } from '../components/dom.js';
import { hideStatus, setStatus } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { formatDate, routes } from '../lib/format.js';

mountSiteLayout('about');

const status = document.querySelector('#load-status');
const stats = document.querySelector('#about-stats');

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    const cities = new Set(catalog.suppliers.map((supplier) => supplier.city).filter(Boolean));
    const items = [
      ['Products', catalog.products.length, routes.products()],
      ['Categories', catalog.categories.length, routes.categories()],
      ['Suppliers', catalog.suppliers.length, routes.suppliers()],
      ['Recorded offers', catalog.offers.length, routes.offers()],
      ['Supplier cities', cities.size, null],
      ['Source records', catalog.sourcesById.size, routes.methodology()],
    ];
    stats.append(
      el('dl', { className: 'stat-grid' }, items.map(([term, value, href]) => el('div', {}, [
        el('dt', { text: term }),
        el('dd', {}, [href ? link(href, String(value)) : String(value)]),
      ]))),
      el('p', {
        className: 'source-note',
        text: `Counts are calculated from the published dataset. Snapshot generated ${formatDate(catalog.metadata?.source_snapshot_generated_at) ?? 'on an unknown date'}; supplier cities: ${[...cities].sort().join(', ') || 'none recorded'}.`,
      }),
    );
    stats.hidden = false;
    hideStatus(status);
  } catch (error) {
    setStatus(status, 'error', `The dataset summary could not be loaded (${error.message}). The information below still applies.`);
  }
}

void start();
