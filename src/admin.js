/*
 * src/catalog-search.js
 * Inzegane Platform — Catalog Search Module
 *
 * This module provides a search engine for the product catalog, allowing filtering
 * by categories, brands, suppliers, conditions, freshness statuses, and stock statuses.
 * It uses ItemsJS to index and search the catalog data efficiently.
 */

import itemsjs from 'itemsjs';
import { buildCatalogProducts } from './database.js';

const COLLECTIONS = [
  'categories',
  'brands',
  'suppliers',
  'products',
  'offers',
  'price_history',
  'availability_checks',
  'sources',
];

const FACET_FIELDS = [
  'category_ids',
  'brand_ids',
  'supplier_ids',
  'conditions',
  'freshness_statuses',
  'effective_stock_statuses',
];

const AGGREGATIONS = Object.fromEntries(FACET_FIELDS.map((field) => [
  field,
  { size: 1000, conjunction: false, sort: 'key', order: 'asc' },
]));

const SORTINGS = {
  name_asc: {
    field: ['sort_name', 'id'],
    order: ['asc', 'asc'],
  },
  latest_price_desc: {
    field: ['latest_price_timestamp', 'sort_name', 'id'],
    order: ['desc', 'asc', 'asc'],
  },
  latest_verification_desc: {
    field: ['latest_verification_timestamp', 'sort_name', 'id'],
    order: ['desc', 'asc', 'asc'],
  },
};

function normalizeSearchText(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLocaleLowerCase()
    .trim();
}

function collectTextValues(value, values = []) {
  if (typeof value === 'string' || typeof value === 'number') {
    values.push(String(value));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, values));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectTextValues(item, values));
  }
  return values;
}

function latestDocumentedPriceTimestamp(product, now) {
  return (product.priceHistory ?? []).reduce((latest, observation) => {
    const timestamp = Date.parse(observation.observed_at);
    if (typeof observation.unit_price !== 'number'
      || !Number.isFinite(observation.unit_price)
      || observation.unit_price < 0
      || !Number.isFinite(timestamp)
      || timestamp > now.getTime()) {
      return latest;
    }
    return Math.max(latest, timestamp);
  }, 0);
}

function latestVerificationTimestamp(product, now) {
  return (product.offers ?? []).reduce((latest, offer) => {
    const timestamp = Date.parse(offer.last_verified_at ?? offer.observed_at);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return latest;
    return Math.max(latest, timestamp);
  }, 0);
}

function toSearchDocument(product, now, categoriesById) {
  const categoryPath = product.classification?.category_path ?? [];
  const categoryIds = [...new Set([
    ...categoryPath,
    product.classification?.category_id,
  ].filter(Boolean))];
  const supplierIds = [...new Set((product.offers ?? []).map(({ supplier_id }) => supplier_id).filter(Boolean))];
  const freshnessStatuses = [...new Set((product.offers ?? []).map(({ freshness }) => freshness?.status).filter(Boolean))];
  const stockStatuses = [...new Set((product.offers ?? []).map(({ effectiveStockStatus }) => effectiveStockStatus).filter(Boolean))];
  const frenchName = product.identity?.product_name_fr ?? '';
  const searchValues = [
    ...collectTextValues(product.identity),
    ...collectTextValues(product.brand),
    ...collectTextValues(product.classification),
    ...collectTextValues(product.category),
    ...categoryPath.flatMap((id) => collectTextValues(categoriesById.get(id))),
    ...(product.offers ?? []).flatMap(({ supplier }) => [
      supplier?.business_name,
      supplier?.business_name_ar,
      supplier?.business_name_fr,
    ]),
    ...collectTextValues(product.specifications),
    ...collectTextValues(product.variants),
    ...collectTextValues(product.packaging),
  ].filter((value) => value !== null && value !== undefined);

  return {
    id: product.product_id,
    name: normalizeSearchText(frenchName),
    sort_name: normalizeSearchText(frenchName),
    searchable_text: normalizeSearchText(searchValues.join(' ')),
    category_ids: categoryIds,
    brand_ids: product.identity?.brand_id ? [product.identity.brand_id] : [],
    supplier_ids: supplierIds,
    conditions: product.condition ? [product.condition] : [],
    freshness_statuses: freshnessStatuses,
    effective_stock_statuses: stockStatuses,
    latest_price_timestamp: latestDocumentedPriceTimestamp(product, now),
    latest_verification_timestamp: latestVerificationTimestamp(product, now),
  };
}

function assertDatabaseCollections(database) {
  if (!database || typeof database !== 'object') {
    throw new Error('A validated catalogue database is required to create the search index');
  }
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(database[collection])) {
      throw new Error(`A validated catalogue database must include the "${collection}" collection`);
    }
  }
}

function safeInteger(value, fallback, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function createCatalogSearch(database, { now = new Date() } = {}) {
  assertDatabaseCollections(database);

  let productsById = new Map();
  let indexedDocuments = [];
  const engine = itemsjs([], {
    aggregations: AGGREGATIONS,
    searchableFields: ['searchable_text'],
    sortings: SORTINGS,
    isExactSearch: true,
  });

  function reindex(nextDatabase, options = {}) {
    assertDatabaseCollections(nextDatabase);
    const nextIndexedAt = options.now ?? new Date();
    if (!(nextIndexedAt instanceof Date) || !Number.isFinite(nextIndexedAt.getTime())) {
      throw new Error('The search index date must be a valid Date');
    }
    const nextCatalogProducts = buildCatalogProducts(nextDatabase, nextIndexedAt);
    const nextProductsById = new Map(nextCatalogProducts.map((product) => [product.product_id, product]));
    const categoriesById = new Map(nextDatabase.categories.map((category) => [category.category_id, category]));
    const nextIndexedDocuments = nextCatalogProducts.map(
      (product) => toSearchDocument(product, nextIndexedAt, categoriesById),
    );
    engine.reindex(nextIndexedDocuments);
    productsById = nextProductsById;
    indexedDocuments = nextIndexedDocuments;
  }

  function search(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Search options must be an object');
    }
    const {
      query = '',
      categoryId = '',
      brandId = '',
      supplierId = '',
      condition = '',
      freshness = '',
      stockStatus = '',
      sortBy = 'name',
      page = 1,
      pageSize = 12,
    } = options;
    if (typeof query !== 'string') throw new Error('Search query must be a string');
    const safePageSize = safeInteger(pageSize, 12, 1, 50);
    const safePage = safeInteger(page, 1, 1);
    const filters = {};
    for (const [value, field] of [
      [categoryId, 'category_ids'],
      [brandId, 'brand_ids'],
      [supplierId, 'supplier_ids'],
      [condition, 'conditions'],
      [freshness, 'freshness_statuses'],
      [stockStatus, 'effective_stock_statuses'],
    ]) {
      if (value === '') continue;
      if (typeof value !== 'string') throw new Error(`Search filter "${field}" must be a string`);
      filters[field] = [value];
    }

    const normalizedQuery = normalizeSearchText(query);
    const searchOptions = {
      query: /\p{Script=Arabic}/u.test(normalizedQuery) ? '' : normalizedQuery,
      sort: sortBy === 'price'
        ? 'latest_price_desc'
        : sortBy === 'verified' ? 'latest_verification_desc' : 'name_asc',
      filters,
      page: safePage,
      per_page: safePageSize,
    };
    if (/\p{Script=Arabic}/u.test(normalizedQuery)) {
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      searchOptions.ids = indexedDocuments
        .filter(({ searchable_text }) => terms.every((term) => searchable_text.includes(term)))
        .map(({ id }) => id);
    }

    let result = engine.search(searchOptions);
    const total = result.pagination.total;
    const pageCount = Math.max(1, Math.ceil(total / safePageSize));
    const actualPage = Math.min(safePage, pageCount);
    if (actualPage !== result.pagination.page) {
      result = engine.search({ ...searchOptions, page: actualPage });
    }

    const products = result.data.items.map(({ id }) => {
      const product = productsById.get(id);
      if (!product) throw new Error(`ItemsJS returned an unknown product identifier "${id}"`);
      return {
        ...product,
        offers: (product.offers ?? []).filter((offer) =>
          (!supplierId || offer.supplier_id === supplierId)
          && (!freshness || offer.freshness?.status === freshness)
          && (!stockStatus || offer.effectiveStockStatus === stockStatus)),
      };
    });

    return {
      products,
      total,
      page: actualPage,
      pageCount,
      facets: result.data.aggregations,
    };
  }

  reindex(database, { now });
  return { search, reindex };
}