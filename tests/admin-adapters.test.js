import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { adaptProduct, toProductPayload } from '../src/admin/adapters/product-adapter.js';
import { adaptSupplier, toSupplierPayload } from '../src/admin/adapters/supplier-adapter.js';
import { adaptOffer } from '../src/admin/adapters/offer-adapter.js';
import { adaptAvailabilityCheck } from '../src/admin/adapters/availability-adapter.js';
import { adaptPriceObservation } from '../src/admin/adapters/price-history-adapter.js';
import { escapeHtml, formatDate } from '../src/admin/ui/dom-helpers.js';

describe('Admin Resource Adapters & Canonical Mapping', () => {
  test('adaptProduct normalizes canonical nested identity and classification', () => {
    const raw = {
      product_id: 'prd_001',
      identity: { product_name_fr: 'Câble USB-C', manufacturer_model: 'X14', brand_id: 'brd_hoco' },
      classification: { category_id: 'cat_mob' },
      condition: 'new',
    };
    const adapted = adaptProduct(raw);
    assert.equal(adapted.id, 'prd_001');
    assert.equal(adapted.name, 'Câble USB-C');
    assert.equal(adapted.model, 'X14');
    assert.equal(adapted.categoryId, 'cat_mob');
    assert.equal(adapted.brandId, 'brd_hoco');
  });

  test('toProductPayload builds nested identity and classification from FormData', () => {
    const formData = new FormData();
    formData.set('product_id', 'prd_new');
    formData.set('product_name_fr', 'Prise Wi-Fi');
    formData.set('product_name_ar', 'قابس');
    formData.set('category_id', 'cat_smart');
    formData.set('brand_id', 'brd_x');
    formData.set('manufacturer_model', 'SP-16');
    formData.set('condition', 'new');

    const payload = toProductPayload(formData);
    assert.equal(payload.product_id, 'prd_new');
    assert.equal(payload.identity.product_name_fr, 'Prise Wi-Fi');
    assert.equal(payload.identity.product_name_ar, 'قابس');
    assert.equal(payload.identity.brand_id, 'brd_x');
    assert.equal(payload.classification.category_id, 'cat_smart');
    assert.equal(payload.condition, 'new');
  });

  test('adaptSupplier normalizes business_name, business_type, locality, and public_whatsapp', () => {
    const raw = {
      supplier_id: 'sup_001',
      business_name: 'Massira Grossiste',
      business_type: 'regional_wholesaler',
      city: 'Inezgane',
      locality: 'Grand Marché',
      public_whatsapp: '+212600000000',
    };
    const adapted = adaptSupplier(raw);
    assert.equal(adapted.id, 'sup_001');
    assert.equal(adapted.name, 'Massira Grossiste');
    assert.equal(adapted.type, 'regional_wholesaler');
    assert.equal(adapted.location, 'Grand Marché, Inezgane');
    assert.equal(adapted.phone, '+212600000000');
  });

  test('toSupplierPayload writes canonical business_type from form fields', () => {
    const formData = new FormData();
    formData.set('supplier_id', 'sup_new');
    formData.set('business_name', 'Atlas Grossiste');
    formData.set('business_type', 'cash_and_carry');
    formData.set('city', 'Inezgane');
    formData.set('locality', 'Triq Tiznit');
    formData.set('public_whatsapp', '+212611111111');

    const payload = toSupplierPayload(formData);
    assert.equal(payload.supplier_id, 'sup_new');
    assert.equal(payload.business_name, 'Atlas Grossiste');
    assert.equal(payload.business_type, 'cash_and_carry');
    assert.equal(payload.public_whatsapp, '+212611111111');
  });

  test('adaptOffer correctly extracts unit_price and links product & supplier names', () => {
    const raw = {
      offer_id: 'off_001',
      product_id: 'prd_001',
      supplier_id: 'sup_001',
      unit_price: 15.5,
      currency: 'MAD',
      minimum_order_quantity: 10,
      stock_status: 'in_stock',
      last_verified_at: '2025-02-18',
    };
    const pMap = new Map([['prd_001', 'Produit Test']]);
    const sMap = new Map([['sup_001', 'Fournisseur Test']]);
    const adapted = adaptOffer(raw, pMap, sMap);
    assert.equal(adapted.id, 'off_001');
    assert.equal(adapted.price, 15.5);
    assert.equal(adapted.minQuantity, 10);
    assert.equal(adapted.productName, 'Produit Test');
    assert.equal(adapted.supplierName, 'Fournisseur Test');
    assert.equal(adapted.status, 'in_stock');
    assert.equal(adapted.verifiedAt, '2025-02-18');
  });

  test('adaptAvailabilityCheck maps real audit logs instead of offers', () => {
    const raw = {
      availability_check_id: 'ach_001',
      product_id: 'prd_001',
      supplier_id: 'sup_001',
      availability_status: 'in_stock',
      quantity_confirmed: 40,
      checked_at: '2025-02-15',
    };
    const adapted = adaptAvailabilityCheck(raw);
    assert.equal(adapted.id, 'ach_001');
    assert.equal(adapted.quantityConfirmed, 40);
    assert.equal(adapted.checkedAt, '2025-02-15');
  });

  test('adaptPriceObservation maps observed_at and unit_price', () => {
    const raw = {
      price_observation_id: 'pho_001',
      product_id: 'prd_001',
      unit_price: 120,
      observed_at: '2025-02-10',
      currency: 'MAD',
      source_id: 'src_01',
    };
    const adapted = adaptPriceObservation(raw);
    assert.equal(adapted.id, 'pho_001');
    assert.equal(adapted.price, 120);
    assert.equal(adapted.observedAt, '2025-02-10');
    assert.equal(adapted.sourceId, 'src_01');
  });

  test('adapters return null for invalid input', () => {
    assert.equal(adaptProduct(null), null);
    assert.equal(adaptSupplier(undefined), null);
    assert.equal(adaptOffer(null), null);
    assert.equal(adaptAvailabilityCheck('x'), null);
    assert.equal(adaptPriceObservation(42), null);
  });
});

describe('UI & DOM Safety Helpers', () => {
  test('escapeHtml neutralizes dangerous characters', () => {
    const dangerous = '<script>alert("xss")</script>&foo';
    assert.equal(escapeHtml(dangerous), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;foo');
  });

  test('formatDate safely formats ISO date strings', () => {
    assert.equal(formatDate('2025-02-15'), '15/02/2025');
    assert.equal(formatDate(null), '—');
  });
});
