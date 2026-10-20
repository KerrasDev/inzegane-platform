/**
 * src/public/pages/suppliers.js
 * Inzegane Platform — Supplier directory (pages/suppliers/index.html).
 *
 * URL parameters: q (text search), city, category.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { chip, el, link } from '../components/dom.js';
import { hideStatus, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { categoryName, formatDate, label, pluralize, routes, supplierName } from '../lib/format.js';

mountSiteLayout('suppliers');

const status = document.querySelector('#load-status');
const content = document.querySelector('#page-content');

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

function supplierCard(supplier, catalog) {
  const offers = catalog.offersBySupplier.get(supplier.supplier_id) ?? [];
  const productCount = new Set(offers.map((offer) => offer.product_id)).size;
  const verified = formatDate(supplier.last_verified_at);
  const categories = (supplier.supplier_categories ?? []).map((id) => catalog.categoriesById.get(id)).filter(Boolean);
  return el('article', { className: 'entity-card' }, [
    el('h2', { className: 'entity-card__title' }, [link(routes.supplier(supplier.supplier_id), supplierName(supplier))]),
    el('p', { className: 'entity-card__meta', text: [label('businessType', supplier.business_type), label('wholesaleStatus', supplier.wholesale_status)].filter(Boolean).join(' · ') }),
    el('p', { className: 'entity-card__meta', text: [supplier.city, supplier.locality].filter(Boolean).join(' · ') }),
    categories.length ? el('ul', { className: 'chip-list', attrs: { 'aria-label': 'Recorded specialties' } }, categories.map((category) => el('li', {}, [
      el('span', { className: 'chip' }, [link(routes.category(category.category_id), categoryName(category))]),
    ]))) : null,
    el('p', { className: 'entity-card__meta', text: `${pluralize(offers.length, 'recorded offer')} for ${pluralize(productCount, 'product')}` }),
    el('p', {}, [chip(verified ? `Details last verified ${verified}` : 'Verification date unknown', 'warning')]),
    link(routes.supplier(supplier.supplier_id), 'View supplier details', 'card-link'),
  ]);
}

function render(catalog) {
  const params = new URLSearchParams(window.location.search);
  const form = el('form', { className: 'filters filters--compact directory-toolbar', attrs: { role: 'search', 'aria-label': 'Filter suppliers' } });
  const query = el('input', { attrs: { id: 'supplier-query', name: 'q', type: 'search', placeholder: 'Name, city, locality, specialty…', autocomplete: 'off', value: params.get('q') ?? '' } });
  const cities = [...new Set(catalog.suppliers.map((supplier) => supplier.city).filter(Boolean))].sort();
  const city = el('select', { attrs: { id: 'supplier-city', name: 'city' } }, [new Option('All cities', ''), ...cities.map((value) => new Option(value, value))]);
  const categoryIds = [...new Set(catalog.suppliers.flatMap((supplier) => supplier.supplier_categories ?? []))].filter((id) => catalog.categoriesById.has(id));
  const category = el('select', { attrs: { id: 'supplier-category', name: 'category' } }, [
    new Option('All specialties', ''),
    ...categoryIds.map((id) => new Option(categoryName(catalog.categoriesById.get(id)), id)).sort((a, b) => a.text.localeCompare(b.text)),
  ]);
  city.value = cities.includes(params.get('city')) ? params.get('city') : '';
  category.value = categoryIds.includes(params.get('category')) ? params.get('category') : '';
  const reset = el('button', { className: 'button button--secondary', text: 'Reset filters', attrs: { type: 'button' } });
  form.append(
    el('label', { className: 'search-field', attrs: { for: query.id } }, [el('span', { text: 'Search suppliers' }), query]),
    el('label', { attrs: { for: city.id } }, [el('span', { text: 'City' }), city]),
    el('label', { attrs: { for: category.id } }, [el('span', { text: 'Specialty' }), category]),
    el('div', { className: 'filters__actions' }, [reset]),
  );
  const summary = el('p', { attrs: { 'aria-live': 'polite' } });
  const grid = el('div', { className: 'entity-grid' });
  content.replaceChildren(form, el('section', { className: 'catalog', attrs: { 'aria-labelledby': 'supplier-results' } }, [
    el('div', { className: 'catalog-heading' }, [el('h2', { text: 'Supplier directory', attrs: { id: 'supplier-results' } }), summary]),
    grid,
  ]));

  const update = (mode) => {
    const terms = normalize(query.value).split(/\s+/).filter(Boolean);
    const matches = catalog.suppliers.filter((supplier) => {
      if (city.value && supplier.city !== city.value) return false;
      if (category.value && !(supplier.supplier_categories ?? []).includes(category.value)) return false;
      const haystack = normalize([
        supplier.business_name, supplier.business_name_fr, supplier.business_name_ar, supplier.city, supplier.locality,
        ...(supplier.supplier_categories ?? []).map((id) => categoryName(catalog.categoriesById.get(id))),
      ].join(' '));
      return terms.every((term) => haystack.includes(term));
    }).sort((a, b) => supplierName(a).localeCompare(supplierName(b)));
    summary.textContent = `${pluralize(matches.length, 'supplier')} found`;
    grid.replaceChildren(...matches.map((supplier) => supplierCard(supplier, catalog)));
    if (matches.length === 0) grid.append(el('p', { className: 'no-results', text: 'No suppliers match these criteria.' }));
    reset.disabled = !query.value && !city.value && !category.value;
    if (mode) {
      const url = new URL(window.location.href);
      const next = new URLSearchParams();
      if (query.value.trim()) next.set('q', query.value.trim());
      if (city.value) next.set('city', city.value);
      if (category.value) next.set('category', category.value);
      url.search = next.toString();
      if (url.href !== window.location.href) window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
    }
  };
  query.addEventListener('input', () => update('replace'));
  city.addEventListener('change', () => update('push'));
  category.addEventListener('change', () => update('push'));
  reset.addEventListener('click', () => {
    query.value = '';
    city.value = '';
    category.value = '';
    update('push');
    query.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update('push');
  });
  window.addEventListener('popstate', () => render(catalog));
  update('replace');
}

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    hideStatus(status);
    render(catalog);
  } catch (error) {
    showLoadError(status, error, content);
  }
}

void start();
