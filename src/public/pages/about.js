/**
 * src/public/pages/about.js
 * Inzegane Platform — About page: adds dataset counts derived from the data.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { el, link } from '../components/dom.js';
import { setStatus, showDatasetNotice } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { formatDate, routes } from '../lib/format.js';
import { t } from '../../i18n/index.js';

mountSiteLayout('about');

// Update document title based on locale
document.title = t('about.title') + ' · Inzegane Platform';

// Update meta description
const metaDesc = document.querySelector('meta[name="description"]');
if (metaDesc) metaDesc.setAttribute('content', t('about.intro'));

// Update static HTML text
const pageTitle = document.querySelector('.page-title');
const pageIntro = document.querySelector('.page-intro');
if (pageTitle) pageTitle.textContent = t('about.title');
if (pageIntro) pageIntro.textContent = t('about.intro');

const status = document.querySelector('#load-status');
const stats = document.querySelector('#about-stats');
const statsHeading = document.querySelector('#about-stats-heading');
if (statsHeading) statsHeading.textContent = t('about.datasetContains');

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    const cities = new Set(catalog.suppliers.map((supplier) => supplier.city).filter(Boolean));
    const items = [
      [t('about.statsProducts'), catalog.products.length, routes.products()],
      [t('about.statsCategories'), catalog.categories.length, routes.categories()],
      [t('about.statsSuppliers'), catalog.suppliers.length, routes.suppliers()],
      [t('about.statsOffers'), catalog.offers.length, routes.offers()],
      [t('about.statsSupplierCities'), cities.size, null],
      [t('about.statsSourceRecords'), catalog.sourcesById.size, routes.methodology()],
    ];
    stats.append(
      el('dl', { className: 'stat-grid' }, items.map(([term, value, href]) => el('div', {}, [
        el('dt', { text: term }),
        el('dd', {}, [href ? link(href, String(value)) : String(value)]),
      ]))),
      el('p', {
        className: 'source-note',
        text: t('about.sourceNote', { date: formatDate(catalog.metadata?.source_snapshot_generated_at) ?? 'unknown date', cities: [...cities].sort().join(', ') || 'none recorded' }),
      }),
    );
    stats.hidden = false;
    showDatasetNotice(status, catalog);

    // Render prose content
    const prose = document.querySelector('#about-prose');
    if (prose) {
      prose.append(
        el('h2', { text: t('about.whatCatalogProvides'), className: 'section-title' }),
        el('p', { text: t('about.providesIntro') }),
        el('ul', {}, [
          el('li', {}, [el('strong', { text: t('about.statsProducts') }), ' ' + t('about.providesProducts')]),
          el('li', {}, [el('strong', { text: t('about.statsSuppliers') }), ' ' + t('about.providesSuppliers')]),
          el('li', {}, [el('strong', { text: t('about.statsOffers') }), ' ' + t('about.providesOffers')]),
          el('li', {}, [el('strong', { text: t('about.statsSourceRecords') }), ' ' + t('about.providesHistory')]),
        ]),
        el('h2', { text: t('about.howToUse'), className: 'section-title' }),
        el('ol', {}, [
          el('li', {}, [t('about.howToUseStep1Prefix'), ' ', link(routes.products(), t('about.howToUseStep1Link1')), ' ', t('about.howToUseStep1Or'), ' ', link(routes.categories(), t('about.howToUseStep1Link2')), '.']),
          el('li', { text: t('about.howToUseStep2') }),
          el('li', { text: t('about.howToUseStep3') }),
          el('li', { text: t('about.howToUseStep4') }),
        ]),
        el('h2', { text: t('about.notLivePrice'), className: 'section-title' }),
        el('p', { text: t('about.notLivePriceP1') }),
        el('p', { text: t('about.notLivePriceP2') }),
        el('h2', { text: t('about.corrections'), className: 'section-title' }),
        el('p', {}, [t('about.correctionsP1Prefix'), ' ', link(routes.contact(), t('about.correctionsP1Link')), ' ', t('about.correctionsP1Suffix')]),
      );
    }
  } catch (error) {
    setStatus(status, 'error', t('about.loadError', { error: error.message }));
  }
}

void start();
