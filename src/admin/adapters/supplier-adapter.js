/**
 * src/admin/adapters/supplier-adapter.js
 * Inzegane Platform — Supplier Adapter
 *
 * Maps canonical supplier records to admin view models and form payloads.
 * Canonical fields: supplier_id, business_name, business_type, city, locality, public_whatsapp.
 */

export function adaptSupplier(raw) {
  if (!raw || typeof raw !== 'object') return null;

  return {
    id: raw.supplier_id || raw.id || '',
    name: raw.business_name || raw.name || '—',
    type: raw.business_type || raw.supplier_type || raw.type || 'unknown',
    location: [raw.locality, raw.city || raw.location].filter(Boolean).join(', ') || '—',
    phone: raw.public_whatsapp || raw.public_phone || raw.phone || raw.contact || null,
    isDraft: Boolean(raw._isNew),
  };
}

export function toSupplierPayload(formData, existing = {}) {
  const businessType =
    formData.get('business_type')?.trim() ||
    formData.get('supplier_type')?.trim() ||
    existing.business_type ||
    'regional_wholesaler';

  return {
    ...existing,
    supplier_id: formData.get('supplier_id')?.trim() || existing.supplier_id,
    business_name: formData.get('business_name')?.trim() || '',
    business_type: businessType,
    city: formData.get('city')?.trim() || 'Inezgane',
    locality: formData.get('locality')?.trim() || '',
    public_whatsapp: formData.get('public_whatsapp')?.trim() || null,
  };
}