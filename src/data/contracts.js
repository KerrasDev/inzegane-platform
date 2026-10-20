/**
 * src/data/contracts.js
 * Inzegane Platform — Data Access Layer Contracts
 */

export const RESOURCES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  SUPPLIERS: 'suppliers',
  OFFERS: 'offers',
  PRICE_HISTORY: 'price_history',
  AVAILABILITY_CHECKS: 'availability_checks',
  SOURCES: 'sources',
};

export const PRIMARY_KEYS = {
  products: 'product_id',
  categories: 'category_id',
  brands: 'brand_id',
  suppliers: 'supplier_id',
  offers: 'offer_id',
  price_history: 'price_observation_id',
  availability_checks: 'availability_check_id',
  sources: 'source_id',
};

export const DATA_COLLECTIONS = [...Object.keys(PRIMARY_KEYS), 'research_summary'];

const REQUIRED_PROVIDER_METHODS = [
  'getCapabilities',
  'getSnapshot',
  'list',
  'getById',
  'create',
  'update',
  'delete',
  'getMetadata',
];

export function assertDataProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new TypeError('A data provider object is required.');
  }

  const missingMethods = REQUIRED_PROVIDER_METHODS.filter(
    (method) => typeof provider[method] !== 'function',
  );
  if (missingMethods.length > 0) {
    throw new TypeError(`Invalid data provider; missing methods: ${missingMethods.join(', ')}.`);
  }

  const capabilities = provider.getCapabilities();
  if (
    !capabilities ||
    typeof capabilities.canWrite !== 'boolean' ||
    typeof capabilities.canDelete !== 'boolean' ||
    typeof capabilities.persistent !== 'boolean' ||
    typeof capabilities.type !== 'string' ||
    typeof capabilities.name !== 'string'
  ) {
    throw new TypeError('Invalid data provider capabilities.');
  }

  return provider;
}

export function createOperationResult(success, data = null, error = null) {
  return {
    success,
    data,
    error: error ? (typeof error === 'string' ? error : error.message || 'Opération échouée') : null,
    timestamp: new Date().toISOString(),
  };
}