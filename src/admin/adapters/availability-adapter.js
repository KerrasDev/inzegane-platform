/**
 * src/admin/adapters/availability-adapter.js
 *
 * Inzegane Platform — Availability Adapter
 *
 * This module provides functions to adapt raw availability check data from the backend
 * into a format suitable for the frontend.
 */

export function adaptAvailabilityCheck(raw, productMap = new Map(), supplierMap = new Map()) {
  if (!raw || typeof raw !== 'object') return null;

  return {
    id: raw.availability_check_id || raw.id || '',
    productId: raw.product_id,
    productName: productMap.get(raw.product_id) || raw.product_id || '—',
    supplierId: raw.supplier_id,
    supplierName: supplierMap.get(raw.supplier_id) || raw.supplier_id || '—',
    status: raw.availability_status || 'unknown',
    quantityConfirmed: raw.quantity_confirmed != null ? raw.quantity_confirmed : null,
    checkedAt: raw.checked_at || null,
  };
}