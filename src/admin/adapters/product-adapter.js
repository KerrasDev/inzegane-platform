/**
 * src/admin/adapters/product-adapter.js
 *
 * Inzegane Platform — Product Adapter
 *
 * This module provides functions to adapt raw product data from the backend
 * into a format suitable for the frontend, and to convert form data into a
 * payload for product creation or update.
 */
export function adaptProduct(rawProduct) {
  if (!rawProduct || typeof rawProduct !== 'object') return null;

  return {
    id: rawProduct.product_id || rawProduct.id || '',
    name: rawProduct.identity?.product_name_fr || rawProduct.name || '—',
    nameAr: rawProduct.identity?.product_name_ar || rawProduct.nameAr || '',
    categoryId: rawProduct.classification?.category_id || rawProduct.category_id || '',
    brandId: rawProduct.identity?.brand_id || rawProduct.brand_id || '',
    brandName: rawProduct.identity?.brand_name || rawProduct.brandName || '—',
    model: rawProduct.identity?.manufacturer_model || rawProduct.model || '—',
    condition: rawProduct.condition || 'new',
    isDraft: Boolean(rawProduct._isNew),
  };
}

export function toProductPayload(formData, existing = {}) {
  return {
    ...existing,
    product_id: formData.get('product_id')?.trim() || existing.product_id,
    identity: {
      ...(existing.identity || {}),
      product_name_fr: formData.get('product_name_fr')?.trim() || '',
      product_name_ar: formData.get('product_name_ar')?.trim() || null,
      brand_id: formData.get('brand_id') || null,
      manufacturer_model: formData.get('manufacturer_model')?.trim() || null,
    },
    classification: {
      ...(existing.classification || {}),
      category_id: formData.get('category_id') || '',
      category_path: existing.classification?.category_path || [formData.get('category_id')].filter(Boolean),
    },
    condition: formData.get('condition') || 'new',
  };
}