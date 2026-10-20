/**
 * src/admin/adapters/price-history-adapter.js
 *
 * Inzegane Platform — Price History Adapter
 *
 * This module provides functions to adapt raw price observation data from the backend
 * into a format suitable for the frontend.
 */

export function adaptPriceObservation(raw, productMap = new Map(), supplierMap = new Map()) {
  if (!raw || typeof raw !== 'object') return null;

  return {
    id: raw.price_observation_id || raw.id || '',
    productId: raw.product_id,
    productName: productMap.get(raw.product_id) || raw.product_id || '—',
    supplierId: raw.supplier_id,
    supplierName: supplierMap.get(raw.supplier_id) || raw.supplier_id || '—',
    price: typeof raw.unit_price === 'number' ? raw.unit_price : (raw.price ?? 0),
    currency: raw.currency || 'MAD',
    observedAt: raw.observed_at || raw.recorded_at || null,
    sourceId: raw.source_id || '—',
  };
}