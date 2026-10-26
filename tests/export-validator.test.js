import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { describe } from 'node:test';
import { validateExport, formatValidationSummary } from '../src/data/export-validator.js';

// Node.js mock for localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

function createSeedFetch() {
  return async (url) => {
    const fileUrl = new URL(`../public${url}`, import.meta.url);
    const body = fs.readFileSync(fileUrl, 'utf8');
    return {
      ok: true,
      headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => JSON.parse(body),
    };
  };
}

describe('Export Validator', () => {
  test('rejects null snapshot', () => {
    const result = validateExport(null);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  });

  test('rejects snapshot missing required resources', () => {
    const result = validateExport({});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('missing or not an array')));
  });

  test('validates a complete seed snapshot', async () => {
    const fetchImpl = createSeedFetch();
    const res = await fetchImpl('/data/products.json');
    const products = await res.json();

    // Build a minimal valid snapshot from seed data
    const snapshot = {
      products: [],
      categories: [],
      brands: [],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
      metadata: { independently_verified: false },
    };

    // Load actual seed data
    const collections = ['products', 'categories', 'brands', 'suppliers', 'offers', 'price_history', 'availability_checks', 'sources'];
    const fileMap = {
      products: 'products.json',
      categories: 'categories.json',
      brands: 'brands.json',
      suppliers: 'suppliers.json',
      offers: 'offers.json',
      price_history: 'price-history.json',
      availability_checks: 'availability-checks.json',
      sources: 'sources.json',
    };

    for (const col of collections) {
      const r = await fetchImpl(`/data/${fileMap[col]}`);
      snapshot[col] = await r.json();
    }

    const metaRes = await fetchImpl('/data/database-metadata.json');
    snapshot.metadata = await metaRes.json();

    const result = validateExport(snapshot);
    // Should pass (no blocking errors) — warnings allowed
    assert.equal(result.ok, true, `Expected ok=true but got errors: ${JSON.stringify(result.errors)}`);
    assert.ok(result.recordsChecked > 0);
    assert.ok(result.counts.products > 0);
  });

  test('detects broken cross-reference', () => {
    const snapshot = {
      products: [{ product_id: 'p1', classification: { category_id: 'nonexistent_cat' }, identity: { brand_id: 'nonexistent_brand' } }],
      categories: [],
      brands: [],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('does not exist')));
  });

  test('detects duplicate IDs', () => {
    const snapshot = {
      products: [
        { product_id: 'dup', classification: { category_id: 'c1' }, identity: { brand_id: 'b1' } },
        { product_id: 'dup', classification: { category_id: 'c1' }, identity: { brand_id: 'b1' } },
      ],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('Duplicate')));
  });

  test('warns on empty collections and unverified data', () => {
    const snapshot = {
      products: [],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
      metadata: { independently_verified: false },
    };
    const result = validateExport(snapshot);
    // Empty products is a warning, not blocking (no required-field errors since empty)
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings.some(w => w.reason.includes('empty') || w.reason.includes('not independently verified')));
  });

  test('rejects null record values', () => {
    const snapshot = {
      products: [null],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('Invalid record')));
  });

  test('rejects primitive record values', () => {
    const snapshot = {
      products: [42, 'string', true],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('Invalid record')));
    // Should have 3 errors (one per primitive)
    const invalidErrors = result.errors.filter(e => e.reason.includes('Invalid record'));
    assert.equal(invalidErrors.length, 3);
  });

  test('rejects undefined record values', () => {
    const snapshot = {
      products: [undefined],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('Invalid record')));
  });

  test('rejects missing required fields', () => {
    const snapshot = {
      products: [{ product_id: 'p1' }], // missing product_name_fr, category_id, brand_id
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('Required field')));
  });

  test('rejects invalid pattern in product_id', () => {
    const snapshot = {
      products: [{ product_id: 'invalid id!', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('does not match pattern')));
  });

  test('rejects invalid enum value for condition', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' }, condition: 'invalid_condition' }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('invalid value')));
  });

  test('round-trip serialization preserves Arabic and French text', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Produit français', product_name_ar: 'منتج عربي', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Catégorie', name_ar: 'فئة' }],
      brands: [{ brand_id: 'b1', name: 'Marque' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.products[0].identity.product_name_fr, 'Produit français');
    assert.equal(parsed.products[0].identity.product_name_ar, 'منتج عربي');
    assert.equal(parsed.categories[0].name_ar, 'فئة');
  });

  test('rejects negative unit_price in offers', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: -5 }],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('must not be negative')));
  });

  test('rejects non-finite unit_price', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: NaN }],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('must be a finite number')));
  });

  test('rejects invalid date format', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: 10, observed_at: 'not-a-date' }],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('must be an ISO 8601 date')));
  });

  test('accepts valid historical dates', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: 10, observed_at: '2024-01-15' }],
      price_history: [{ price_observation_id: 'ph1', product_id: 'p1', supplier_id: 's1', unit_price: 12, observed_at: '2023-06-20T10:00:00Z', source_id: 'src1' }],
      availability_checks: [{ availability_check_id: 'ac1', product_id: 'p1', supplier_id: 's1', availability_status: 'in_stock', checked_at: '2024-06-01T15:30:00Z', source_id: 'src1', quantity_confirmed: 10 }],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    // Should pass (no blocking errors from domain constraints)
    assert.equal(result.ok, true, `Expected ok=true but got: ${JSON.stringify(result.errors)}`);
  });

  test('rejects invalid minimum_order_quantity', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: 10, minimum_order_quantity: 0 }],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('minimum_order_quantity must be a positive integer')));
  });

  test('rejects quantity_tier overlap', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [{ offer_id: 'o1', product_id: 'p1', supplier_id: 's1', unit_price: 10, quantity_tiers: [
        { minimum_quantity: 10, maximum_quantity: 50, unit_price: 10 },
        { minimum_quantity: 40, maximum_quantity: 100, unit_price: 9 }, // overlaps
      ] }],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('overlaps')));
  });

  test('rejects out_of_stock with positive quantity', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [{ supplier_id: 's1', business_name: 'Sup', city: 'Inezgane' }],
      offers: [],
      price_history: [],
      availability_checks: [{ availability_check_id: 'ac1', product_id: 'p1', supplier_id: 's1', availability_status: 'out_of_stock', checked_at: '2024-06-01T15:30:00Z', source_id: 'src1', quantity_confirmed: 5 }],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title' }],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('cannot be out_of_stock with positive')));
  });

  test('rejects invalid source URL', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [{ source_id: 'src1', publisher: 'Pub', source_title: 'Title', url: 'not-a-url' }],
    };
    const result = validateExport(snapshot);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.reason.includes('must be an absolute HTTP(S) URL')));
  });

  test('validateExport does not mutate input snapshot', () => {
    const snapshot = {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
    };
    const before = JSON.stringify(snapshot);
    validateExport(snapshot);
    const after = JSON.stringify(snapshot);
    assert.equal(before, after);
  });

  test('formatValidationSummary returns readable string', () => {
    const result = { ok: true, errors: [], warnings: [], recordsChecked: 5 };
    const summary = formatValidationSummary(result);
    assert.ok(summary.includes('Validation passed'));
    assert.ok(summary.includes('5 records checked'));
  });
});