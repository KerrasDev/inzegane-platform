/**
 * src/public/pages/offers.js
 * Inzegane Platform — Recorded offers listing (pages/offers/index.html).
 *
 * URL parameters: q, supplier, category, type (price_type), vat, freshness,
 * sort (verified | product | supplier), page.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { el } from '../components/dom.js';
import { renderOfferCard } from '../components/offer-details.js';
import { renderPagination } from '../components/pagination.js';
import { showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { categoryPathIds, offerVerificationTimestamp } from '../lib/catalog-index.js';
import { categoryName, label, pluralize, productName, supplierName } from '../lib/format.js';

mountSiteLayout('offers');

const status = document.querySelector('#load-status');
const content = document.querySelector('#page-content');
const PAGE_SIZE = 9;
const SORTS = [
  ['verified', 'Most recently verified'],
  ['product', 'Product name (A–Z)'],
  ['supplier', 'Supplier name (A–Z)'],
];

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

function distinct(values) {
  return [...new Set(values.filter(Boolean))];
}

function render(catalog) {
  const offers = catalog.offers;
  const filters = [
    {
      key: 'supplier', text: 'Supplier', all: 'All suppliers',
      options: distinct(offers.map((offer) => offer.supplier_id)).map((id) => [id, supplierName(catalog.suppliersById.get(id))]),
      match: (offer, value) => offer.supplier_id === value,
    },
    {
      key: 'category', text: 'Category', all: 'All categories',
      options: distinct(offers.flatMap((offer) => categoryPathIds(offer.product))).filter((id) => catalog.categoriesById.has(id))
        .map((id) => [id, categoryName(catalog.categoriesById.get(id))]),
      match: (offer, value) => categoryPathIds(offer.product).includes(value),
    },
    {
      key: 'type', text: 'Price type', all: 'All price types',
      options: distinct(offers.map((offer) => offer.price_type)).map((id) => [id, label('priceType', id)]),
      match: (offer, value) => offer.price_type === value,
    },
    {
      key: 'vat', text: 'VAT basis', all: 'Any VAT basis',
      options: distinct(offers.map((offer) => offer.price_includes_vat)).map((id) => [id, label('vat', id)]),
      match: (offer, value) => offer.price_includes_vat === value,
    },
    {
      key: 'freshness', text: 'Verification status', all: 'Any verification status',
      options: distinct(offers.map((offer) => offer.freshness?.status)).map((id) => [id, label('freshness', id)]),
      match: (offer, value) => offer.freshness?.status === value,
    },
  ];

  const form = el('form', { className: 'filters', attrs: { role: 'search', 'aria-label': 'Filter offers' } });
  const query = el('input', { attrs: { id: 'offer-query', name: 'q', type: 'search', placeholder: 'Product, brand, or supplier…', autocomplete: 'off' } });
  form.append(el('label', { className: 'search-field', attrs: { for: query.id } }, [el('span', { text: 'Search offers' }), query]));
  const selects = new Map();
  for (const filter of filters) {
    const options = filter.options.sort((a, b) => a[1].localeCompare(b[1])).map(([value, text]) => new Option(text, value));
    const select = el('select', { attrs: { id: `offer-${filter.key}`, name: filter.key, disabled: options.length === 0 } }, [new Option(filter.all, ''), ...options]);
    selects.set(filter.key, select);
    form.append(el('label', { attrs: { for: select.id } }, [el('span', { text: filter.text }), select]));
  }
  const sort = el('select', { attrs: { id: 'offer-sort', name: 'sort' } }, SORTS.map(([value, text]) => new Option(text, value)));
  form.append(el('label', { attrs: { for: sort.id } }, [el('span', { text: 'Sort by' }), sort]));
  const reset = el('button', { className: 'button button--secondary', text: 'Reset filters', attrs: { type: 'button' } });
  form.append(el('div', { className: 'filters__actions' }, [reset]));

  const summary = el('p', { attrs: { 'aria-live': 'polite' } });
  const grid = el('div', { className: 'offer-grid' });
  const pager = el('nav', { className: 'page-controls', attrs: { 'aria-label': 'Offer pages' } });
  const results = el('section', { className: 'catalog', attrs: { 'aria-labelledby': 'offer-results' } }, [
    el('div', { className: 'catalog-heading' }, [el('h2', { text: 'Offers', attrs: { id: 'offer-results' } }), summary]),
    el('p', { className: 'source-note', text: 'Amounts are not normalized: check the VAT basis, price basis, and quantity tiers before comparing offers. No price-based sorting is provided for that reason.' }),
    grid,
    pager,
  ]);
  content.replaceChildren(form, results);

  let page = 1;
  const isFiltered = () => query.value.trim() !== '' || [...selects.values()].some((select) => select.value) || sort.value !== 'verified';

  function syncUrl(mode) {
    const params = new URLSearchParams();
    if (query.value.trim()) params.set('q', query.value.trim());
    for (const [key, select] of selects) if (select.value) params.set(key, select.value);
    if (sort.value !== 'verified') params.set('sort', sort.value);
    if (page > 1) params.set('page', String(page));
    const url = new URL(window.location.href);
    url.search = params.toString();
    if (url.href !== window.location.href) window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
  }

  function update() {
    const terms = normalize(query.value).split(/\s+/).filter(Boolean);
    const matches = offers.filter((offer) => {
      for (const filter of filters) {
        const value = selects.get(filter.key).value;
        if (value && !filter.match(offer, value)) return false;
      }
      const haystack = normalize([
        productName(offer.product), offer.product?.identity?.product_name_fr, offer.product?.identity?.manufacturer_model,
        offer.product?.brand?.name, supplierName(offer.supplier), offer.supplier?.city, offer.supplier_sku,
      ].join(' '));
      return terms.every((term) => haystack.includes(term));
    });
    const sorters = {
      verified: (a, b) => offerVerificationTimestamp(b) - offerVerificationTimestamp(a) || productName(a.product).localeCompare(productName(b.product)),
      product: (a, b) => productName(a.product).localeCompare(productName(b.product)) || supplierName(a.supplier).localeCompare(supplierName(b.supplier)),
      supplier: (a, b) => supplierName(a.supplier).localeCompare(supplierName(b.supplier)) || productName(a.product).localeCompare(productName(b.product)),
    };
    matches.sort(sorters[sort.value] ?? sorters.verified);
    const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), pageCount);
    const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    summary.textContent = `${pluralize(matches.length, 'recorded offer')} found`;
    grid.replaceChildren(...visible.map((offer) => renderOfferCard(offer, { showProduct: true, showSupplier: true })));
    if (matches.length === 0) grid.append(el('p', { className: 'no-results', text: 'No recorded offers match these criteria. Remove a filter or change your search.' }));
    renderPagination(pager, {
      page,
      pageCount,
      onChange: (next) => {
        page = next;
        syncUrl('push');
        update();
        results.scrollIntoView({ block: 'start' });
      },
    });
    reset.disabled = !isFiltered();
  }

  function restore() {
    const params = new URLSearchParams(window.location.search);
    query.value = params.get('q') ?? '';
    for (const [key, select] of selects) select.value = params.get(key) ?? '';
    sort.value = SORTS.some(([value]) => value === params.get('sort')) ? params.get('sort') : 'verified';
    const requested = Number(params.get('page'));
    page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
    update();
    syncUrl('replace');
  }

  query.addEventListener('input', () => { page = 1; syncUrl('replace'); update(); });
  for (const select of [...selects.values(), sort]) {
    select.addEventListener('change', () => { page = 1; syncUrl('push'); update(); });
  }
  reset.addEventListener('click', () => {
    query.value = '';
    for (const select of selects.values()) select.value = '';
    sort.value = 'verified';
    page = 1;
    syncUrl('push');
    update();
    query.focus();
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); page = 1; syncUrl('push'); update(); });
  window.addEventListener('popstate', restore);
  restore();
}

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    render(catalog);
  } catch (error) {
    showLoadError(status, error, content);
  }
}

void start();
