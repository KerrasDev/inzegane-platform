/**
 * src/public/pages/categories.js
 * Inzegane Platform — Categories listing (pages/categories/index.html).
 *
 * Categories, hierarchy, and product counts are derived from the dataset;
 * coverage tags come from research_summary.coverage_analysis when present.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { chip, el, emptyMessage, link } from '../components/dom.js';
import { showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { suppliersForCategory } from '../lib/catalog-index.js';
import { categoryName, pluralize, routes } from '../lib/format.js';

mountSiteLayout('categories');

const status = document.querySelector('#load-status');
const content = document.querySelector('#page-content');

function coverageLookup(summary) {
  const coverage = summary?.coverage_analysis ?? {};
  const lookup = new Map();
  for (const [field, text, modifier] of [
    ['high_coverage_categories', 'High research coverage', 'accent'],
    ['medium_coverage_categories', 'Medium research coverage', ''],
    ['low_coverage_or_unconfirmed_categories', 'Low or unconfirmed coverage', 'warning'],
  ]) {
    for (const id of coverage[field] ?? []) lookup.set(id, { text, modifier });
  }
  return lookup;
}

function categoryCard(category, catalog, coverage) {
  const count = catalog.productCountByCategory.get(category.category_id) ?? 0;
  const children = catalog.childCategories.get(category.category_id) ?? [];
  const supplierCount = suppliersForCategory(category.category_id, catalog.suppliers, catalog.childCategories).length;
  const card = el('article', { className: 'entity-card' }, [
    el('h2', { className: 'entity-card__title' }, [link(routes.category(category.category_id), categoryName(category))]),
    el('p', { className: 'entity-card__meta', text: `${pluralize(count, 'product')} · ${pluralize(supplierCount, 'supplier')} listing this specialty` }),
  ]);
  const tag = coverage.get(category.category_id);
  if (tag) card.append(el('p', {}, [chip(tag.text, tag.modifier)]));
  if (children.length) {
    card.append(el('ul', { className: 'entity-card__list', attrs: { 'aria-label': `Subcategories of ${categoryName(category)}` } }, children.map((child) => {
      const childCount = catalog.productCountByCategory.get(child.category_id) ?? 0;
      const childTag = coverage.get(child.category_id);
      return el('li', {}, [
        link(routes.category(child.category_id), categoryName(child)),
        ` (${pluralize(childCount, 'product')})`,
        childTag && childTag.modifier === 'warning' ? ` — ${childTag.text.toLowerCase()}` : '',
      ]);
    })));
  }
  card.append(link(routes.category(category.category_id), `Browse ${categoryName(category)}`, 'card-link'));
  return card;
}

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    const roots = catalog.categories.filter((category) => category.parent_id === null || !catalog.categoriesById.has(category.parent_id));
    if (roots.length === 0) {
      content.replaceChildren(emptyMessage('No categories are available in the current dataset.'));
      return;
    }
    const coverage = coverageLookup(catalog.researchSummary);
    content.replaceChildren(
      el('p', { className: 'entity-card__meta', text: `${pluralize(catalog.categories.length, 'category', 'categories')} in ${pluralize(roots.length, 'top-level group')}. Counts include products in subcategories. Categories with zero products exist in the taxonomy but have no documented products yet.` }),
      el('div', { className: 'entity-grid content-section' }, roots.map((category) => categoryCard(category, catalog, coverage))),
    );
  } catch (error) {
    showLoadError(status, error, content);
  }
}

void start();
