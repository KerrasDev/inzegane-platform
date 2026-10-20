/**
 * src/admin/adapters/offer-adapter.js
 *
 * Inzegane Platform — Offer Adapter
 *
 * This module provides functions to adapt raw offer data from the backend
 * into a format suitable for the frontend, and to convert form data into a
 * payload for offer creation or update.
 */

export function adaptOffer(raw, productMap = new Map(), supplierMap = new Map()) {
  if (!raw || typeof raw !== 'object') return null;

  const prodId = raw.product_id;
  const suppId = raw.supplier_id;

  return {
    id: raw.offer_id || raw.id || '',
    productId: prodId,
    productName: productMap.get(prodId) || prodId || '—',
    supplierId: suppId,
    supplierName: supplierMap.get(suppId) || suppId || '—',
    price: typeof raw.unit_price === 'number' ? raw.unit_price : (raw.price ?? 0),
    currency: raw.currency || 'MAD',
    minQuantity: raw.minimum_order_quantity || raw.min_quantity || 1,
    status: raw.stock_status || raw.availability_status || 'unknown',
    verifiedAt: raw.last_verified_at || raw.observed_at || raw.verified_at || null,
  };
}