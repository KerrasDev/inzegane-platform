/**
 * src/public/components/catalog-listing.js
 * Inzegane Platform — Faceted product listing (search, filters, sort, pages).
 *
 * Wraps the existing ItemsJS search service (src/catalog-search.js) and keeps
 * the browser URL in sync with supported parameters:
 *   q, category, brand, supplier, condition, freshness, stock, sort, page
 * Used by the homepage, the products page, and category detail pages.
 */

import { createCatalogSearch } from '../../catalog-search.js';
import { el } from './dom.js';
import { renderPagination } from './pagination.js';
import { renderProductCard } from './product-card.js';
import { categoryName, label, supplierName } from '../lib/format.js';
import { t } from '../../i18n/index.js';

function sortOptions() {
  return [
    ['name', t('catalog.sortName')],
    ['verified', t('catalog.sortVerified')],
    ['price', t('catalog.sortPrice')],
  ];
}
const SORT_VALUES = new Set(['name', 'verified', 'price']);

function filterDefinitions(catalog) {
  const categoryLabel = (id) => {
    const category = catalog.categoriesById.get(id);
    const parent = category?.parent_id ? catalog.categoriesById.get(category.parent_id) : null;
    return parent ? `${categoryName(parent)} › ${categoryName(category)}` : categoryName(category ?? { category_id: id });
  };
  return [
    { key: 'category', searchKey: 'categoryId', facet: 'category_ids', label: t('catalog.category'), all: t('catalog.allCategories'), text: categoryLabel },
    { key: 'brand', searchKey: 'brandId', facet: 'brand_ids', label: t('catalog.brand'), all: t('catalog.allBrands'), text: (id) => catalog.brandsById.get(id)?.name ?? id },
    { key: 'supplier', searchKey: 'supplierId', facet: 'supplier_ids', label: t('catalog.supplier'), all: t('catalog.allSuppliers'), text: (id) => supplierName(catalog.suppliersById.get(id) ?? { supplier_id: id }) },
    { key: 'condition', searchKey: 'condition', facet: 'conditions', label: t('catalog.condition'), all: t('catalog.allConditions'), text: (id) => label('condition', id) },
    { key: 'freshness', searchKey: 'freshness', facet: 'freshness_statuses', label: t('catalog.verification'), all: t('catalog.anyVerification'), text: (id) => label('freshness', id) },
    { key: 'stock', searchKey: 'stockStatus', facet: 'effective_stock_statuses', label: t('catalog.stock'), all: t('catalog.anyStock'), text: (id) => label('stockFacet', id) },
  ];
}

function fieldLabel(id, text, control, className) {
  return el('label', { className, attrs: { for: id } }, [el('span', { text }), control]);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.container  Element that receives the listing.
 * @param {object} options.catalog         Result of buildPublicCatalog().
 * @param {object} [options.fixed]         Locked filters, e.g. { category: 'cat_mob' }.
 * @param {object} [options.preservedParams] URL params kept on sync, e.g. { id }.
 */
export function initCatalogListing({
  container,
  catalog,
  pageSize = 12,
  fixed = {},
  preservedParams = {},
  heading = 'Products',
  headingLevel = 2,
  idPrefix = 'catalog',
}) {
  const search = createCatalogSearch(catalog.database);
  const filters = filterDefinitions(catalog).filter(({ key }) => !(key in fixed));
  const controls = new Map();
  let currentPage = 1;

  const form = el('form', { className: 'filters', attrs: { role: 'search', 'aria-label': t('catalog.filterProducts') } });
  const queryInput = el('input', {
    attrs: { id: `${idPrefix}-query`, name: 'q', type: 'search', placeholder: t('catalog.searchPlaceholder'), autocomplete: 'off' },
  });
  form.append(fieldLabel(`${idPrefix}-query`, t('catalog.searchProducts'), queryInput, 'search-field'));
  for (const filter of filters) {
    const select = el('select', { attrs: { id: `${idPrefix}-${filter.key}`, name: filter.key } }, [new Option(filter.all, '')]);
    controls.set(filter.key, select);
    form.append(fieldLabel(select.id, filter.label, select));
  }
  const sortSelect = el('select', { attrs: { id: `${idPrefix}-sort`, name: 'sort' } }, sortOptions().map(([value, text]) => new Option(text, value)));
  form.append(fieldLabel(sortSelect.id, t('catalog.sortBy'), sortSelect));
  const resetButton = el('button', { className: 'button button--secondary filters__reset', text: t('catalog.resetFilters'), attrs: { type: 'button' } });
  form.append(el('div', { className: 'filters__actions' }, [resetButton]));

  const headingId = `${idPrefix}-heading`;
  const summary = el('p', { attrs: { id: `${idPrefix}-summary`, 'aria-live': 'polite' } });
  const results = el('div', { className: 'product-grid product-grid--summary' });
  const pager = el('nav', { className: 'page-controls', attrs: { 'aria-label': t('catalog.productPages') } });
  const resultsSection = el('section', { className: 'catalog', attrs: { 'aria-labelledby': headingId } }, [
    el('div', { className: 'catalog-heading' }, [
      el(`h${headingLevel}`, { text: t(heading), attrs: { id: headingId } }),
      summary,
    ]),
    results,
    pager,
  ]);
  container.replaceChildren(form, resultsSection);

  function populate(select, buckets, filter) {
    const selected = select.value;
    select.replaceChildren(new Option(filter.all, ''));
    for (const bucket of buckets) {
      const option = new Option(`${filter.text(bucket.key)} (${bucket.doc_count})`, bucket.key);
      option.disabled = bucket.doc_count === 0 && !bucket.selected;
      select.add(option);
    }
    select.value = buckets.some(({ key }) => key === selected) ? selected : '';
    select.disabled = buckets.length === 0;
  }

  function renderFacets(facets) {
    for (const filter of filters) populate(controls.get(filter.key), facets[filter.facet]?.buckets ?? [], filter);
  }

  function searchOptions(page = currentPage) {
    const options = { query: queryInput.value, sortBy: sortSelect.value, page, pageSize };
    for (const filter of filterDefinitions(catalog)) {
      options[filter.searchKey] = fixed[filter.key] ?? controls.get(filter.key)?.value ?? '';
    }
    return options;
  }

  function hasActiveFilters() {
    return queryInput.value.trim() !== '' || [...controls.values()].some((select) => select.value !== '') || sortSelect.value !== 'name';
  }

  function render() {
    const result = search.search(searchOptions());
    currentPage = result.page;
    renderFacets(result.facets);
    results.replaceChildren(...result.products.map((product) => renderProductCard(product, { headingLevel: headingLevel + 1 })));
    const countText = result.total === 1 ? t('catalog.productsFound', { count: result.total }) : t('catalog.productsFoundPlural', { count: result.total });
    summary.textContent = countText;
    if (result.total === 0) {
      const reset = el('button', { className: 'button button--secondary', text: 'Clear search and filters', attrs: { type: 'button' } });
      reset.addEventListener('click', resetAll);
      results.append(el('div', { className: 'empty-state empty-state--inline' }, [
        el('p', { className: 'no-results', text: t('catalog.noMatch') }),
        hasActiveFilters() ? reset : null,
      ]));
    }
    renderPagination(pager, {
      page: result.page,
      pageCount: result.pageCount,
      onChange: (page) => {
        currentPage = page;
        updateUrl('push');
        render();
        resultsSection.scrollIntoView({ block: 'start' });
      },
    });
    resetButton.disabled = !hasActiveFilters();
  }

  function updateUrl(mode) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preservedParams)) if (value) params.set(key, value);
    if (queryInput.value.trim()) params.set('q', queryInput.value.trim());
    for (const [key, select] of controls) if (select.value) params.set(key, select.value);
    if (sortSelect.value !== 'name') params.set('sort', sortSelect.value);
    if (currentPage > 1) params.set('page', String(currentPage));
    const url = new URL(window.location.href);
    url.search = params.toString();
    if (url.href === window.location.href) return;
    window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
  }

  function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    queryInput.value = params.get('q') ?? '';
    for (const [key, select] of controls) select.value = params.get(key) ?? '';
    sortSelect.value = SORT_VALUES.has(params.get('sort')) ? params.get('sort') : 'name';
    const page = Number(params.get('page'));
    currentPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    render();
    updateUrl('replace');
  }

  function resetAll() {
    queryInput.value = '';
    for (const select of controls.values()) select.value = '';
    sortSelect.value = 'name';
    currentPage = 1;
    updateUrl('push');
    render();
    queryInput.focus();
  }

  renderFacets(search.search({ ...searchOptions(1), query: '' }).facets);
  restoreFromUrl();

  queryInput.addEventListener('input', () => {
    currentPage = 1;
    updateUrl('replace');
    render();
  });
  for (const select of [...controls.values(), sortSelect]) {
    select.addEventListener('change', () => {
      currentPage = 1;
      updateUrl('push');
      render();
    });
  }
  resetButton.addEventListener('click', resetAll);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    currentPage = 1;
    updateUrl('push');
    render();
  });
  window.addEventListener('popstate', restoreFromUrl);
}
