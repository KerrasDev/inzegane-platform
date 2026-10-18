/**
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

export function createOperationResult(success, data = null, error = null) {
  return {
    success,
    data,
    error: error ? (typeof error === 'string' ? error : error.message || 'Opération échouée') : null,
    timestamp: new Date().toISOString(),
  };
}