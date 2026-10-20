/**
 * src/public/lib/catalog-index.js
 * Inzegane Platform — Read-only relationship index for public pages.
 *
 * Builds lookup maps over a validated database snapshot so that public pages
 * can resolve products, categories, suppliers, offers, and observations
 * through their canonical identifiers. Pure (no DOM, no fetch).
 */

import { buildCatalogProducts } from '../../database.js';

function groupBy(records, keyOf) {
  const groups = new Map();
  for (const record of records) {
    const key = keyOf(record);
    if (key === null || key === undefined) continue;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return groups;
}

export function offerVerificationTimestamp(offer) {
  const timestamp = Date.parse(offer?.last_verified_at ?? offer?.observed_at ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function categoryPathIds(product) {
  const path = product?.classification?.category_path ?? [];
  return [...new Set([...path, product?.classification?.category_id].filter(Boolean))];
}

export function buildPublicCatalog(database, now = new Date()) {
  const products = buildCatalogProducts(database, now);
  const productsById = new Map(products.map((product) => [product.product_id, product]));
  const categoriesById = new Map(database.categories.map((category) => [category.category_id, category]));
  const brandsById = new Map(database.brands.map((brand) => [brand.brand_id, brand]));
  const suppliersById = new Map(database.suppliers.map((supplier) => [supplier.supplier_id, supplier]));
  const sourcesById = new Map(database.sources.map((source) => [source.source_id, source]));

  const offers = products.flatMap((product) => product.offers.map((offer) => ({
    ...offer,
    sources: (offer.sources ?? []).filter(Boolean),
    product,
  })));
  const offersById = new Map(offers.map((offer) => [offer.offer_id, offer]));

  const productCountByCategory = new Map();
  for (const product of products) {
    for (const categoryId of categoryPathIds(product)) {
      productCountByCategory.set(categoryId, (productCountByCategory.get(categoryId) ?? 0) + 1);
    }
  }

  const priceHistory = database.price_history.map((observation) => ({
    ...observation,
    source: sourcesById.get(observation.source_id) ?? null,
  }));
  const availabilityChecks = database.availability_checks.map((check) => ({
    ...check,
    source: sourcesById.get(check.source_id) ?? null,
  }));

  return {
    database,
    metadata: database.metadata ?? null,
    researchSummary: database.research_summary ?? null,
    products,
    productsById,
    categories: database.categories,
    categoriesById,
    childCategories: groupBy(database.categories, (category) => category.parent_id),
    brandsById,
    suppliers: database.suppliers,
    suppliersById,
    sourcesById,
    offers,
    offersById,
    offersBySupplier: groupBy(offers, (offer) => offer.supplier_id),
    offersByProduct: groupBy(offers, (offer) => offer.product_id),
    productCountByCategory,
    priceHistoryByOffer: groupBy(priceHistory, (observation) => observation.offer_id),
    availabilityChecks,
  };
}

/** Category chain from root to the given category; stops on missing parents or cycles. */
export function categoryAncestors(categoryId, categoriesById) {
  const chain = [];
  const visited = new Set();
  let current = categoriesById.get(categoryId);
  while (current && !visited.has(current.category_id)) {
    visited.add(current.category_id);
    chain.unshift(current);
    current = current.parent_id ? categoriesById.get(current.parent_id) : null;
  }
  return chain;
}

export function suppliersForCategory(categoryId, suppliers, childCategories) {
  const ids = new Set([categoryId, ...(childCategories.get(categoryId) ?? []).map(({ category_id }) => category_id)]);
  return suppliers.filter((supplier) => (supplier.supplier_categories ?? []).some((id) => ids.has(id)));
}

export function newestFirst(records, field) {
  return [...records].sort((left, right) => {
    const a = Date.parse(left?.[field] ?? '');
    const b = Date.parse(right?.[field] ?? '');
    return (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
  });
}
