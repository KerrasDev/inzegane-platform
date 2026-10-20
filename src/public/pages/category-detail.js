/**
 * src/public/pages/category-detail.js
 * Inzegane Platform — Category detail (pages/categories/detail.html?id=CATEGORY_ID).
 *
 * Lists products linked to the category (including its subcategories) with
 * the shared catalog listing, locked to this category.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { initCatalogListing } from '../components/catalog-listing.js';
import { el, link, section } from '../components/dom.js';
import { renderNotFoundState, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { categoryAncestors, suppliersForCategory } from '../lib/catalog-index.js';
import { categoryName, pluralize, readIdFromLocation, routes, supplierName } from '../lib/format.js';

mountSiteLayout('categories');

const root = document.querySelector('#page-root');
const status = document.querySelector('#load-status');

function render(category, catalog) {
  const name = categoryName(category);
  document.title = `${name} · Categories · Inzegane Platform`;
  const ancestors = categoryAncestors(category.category_id, catalog.categoriesById);
  const parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : null;
  const children = catalog.childCategories.get(category.category_id) ?? [];
  const count = catalog.productCountByCategory.get(category.category_id) ?? 0;
  const suppliers = suppliersForCategory(category.category_id, catalog.suppliers, catalog.childCategories);

  const header = el('header', { className: 'page-header' }, [
    el('h1', { className: 'page-title', text: name }),
    el('p', { className: 'page-intro', text: `${pluralize(count, 'documented product')}${children.length ? ' across this category and its subcategories' : ' in this category'}. The dataset does not include written category descriptions.` }),
    category.name_fr && category.name_fr !== name ? el('p', { className: 'page-subtitle', text: category.name_fr, lang: 'fr' }) : null,
    parent ? el('p', { className: 'page-subtitle' }, ['Part of ', link(routes.category(parent.category_id), categoryName(parent))]) : null,
  ]);

  root.replaceChildren(
    renderBreadcrumb([
      { label: 'Home', href: routes.home() },
      { label: 'Categories', href: routes.categories() },
      ...ancestors.slice(0, -1).map((item) => ({ label: categoryName(item), href: routes.category(item.category_id) })),
      { label: name },
    ]),
    header,
  );

  if (children.length) {
    root.append(section('Subcategories', [el('ul', { className: 'chip-list' }, children.map((child) => el('li', {}, [
      el('span', { className: 'chip' }, [link(routes.category(child.category_id), `${categoryName(child)} (${catalog.productCountByCategory.get(child.category_id) ?? 0})`)]),
    ])))], { id: 'subcategories' }));
  }

  if (suppliers.length) {
    root.append(section('Suppliers listing this specialty', [el('ul', { className: 'chip-list' }, suppliers.map((supplier) => el('li', {}, [
      el('span', { className: 'chip' }, [link(routes.supplier(supplier.supplier_id), supplierName(supplier))]),
    ])))], { id: 'suppliers' }));
  }

  const listing = el('div', { className: 'content-section' });
  root.append(listing);
  if (count === 0) {
    listing.append(section('Products', [
      el('div', { className: 'empty-state empty-state--inline' }, [
        el('p', { className: 'no-results', text: 'No products are documented in this category yet.' }),
        link(routes.products(), 'Browse all products', 'button button--secondary'),
      ]),
    ], { className: 'catalog' }));
    return;
  }
  initCatalogListing({
    container: listing,
    catalog,
    pageSize: 9,
    fixed: { category: category.category_id },
    preservedParams: { id: category.category_id },
    heading: `Products in ${name}`,
    idPrefix: 'category',
  });
}

async function start() {
  const id = readIdFromLocation();
  try {
    const catalog = await loadPublicCatalog();
    const category = id ? catalog.categoriesById.get(id) : null;
    if (!category) {
      renderNotFoundState(root, {
        heading: 'Category not found',
        message: id ? 'No category with this identifier exists in the current catalog.' : 'This link does not include a valid category identifier.',
        backHref: routes.categories(),
        backLabel: 'Back to categories',
      });
      return;
    }
    render(category, catalog);
  } catch (error) {
    showLoadError(status, error);
  }
}

void start();
