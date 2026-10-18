import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { LocalDatabaseProvider } from '../src/data/providers/local-db-provider.js';
import { JsonCatalogProvider } from '../src/data/providers/json-provider.js';

// Node.js mock for localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

describe('Admin Data Access Layer & Providers', () => {
  test('LocalDatabaseProvider reports full write and delete capabilities', () => {
    const provider = new LocalDatabaseProvider();
    const caps = provider.getCapabilities();
    assert.equal(caps.canWrite, true);
    assert.equal(caps.canDelete, true);
    assert.equal(caps.persistent, true);
  });

  test('JsonCatalogProvider enforces read-only mode and rejects writes', async () => {
    const provider = new JsonCatalogProvider();
    const caps = provider.getCapabilities();
    assert.equal(caps.canWrite, false);
    assert.equal(caps.canDelete, false);

    const createRes = await provider.create('products', { product_id: 'test' });
    assert.equal(createRes.success, false);
    assert.ok(createRes.error.includes('Lecture seule'));

    const deleteRes = await provider.delete('products', 'test');
    assert.equal(deleteRes.success, false);
    assert.ok(deleteRes.error.includes('Lecture seule'));
  });

  test('LocalDatabaseProvider executes durable CRUD with referential checks', async () => {
    const provider = new LocalDatabaseProvider();

    // 1. Create Brand
    const brand = { brand_id: 'brd_test_unit', name: 'Marque Test' };
    const createBrand = await provider.create('brands', brand);
    assert.equal(createBrand.success, true);

    // 2. Read Brand
    const retrieved = await provider.getById('brands', 'brd_test_unit');
    assert.equal(retrieved.name, 'Marque Test');

    // 3. Update Brand
    const updateRes = await provider.update('brands', 'brd_test_unit', { name: 'Marque Test Modifiée' });
    assert.equal(updateRes.success, true);
    const updated = await provider.getById('brands', 'brd_test_unit');
    assert.equal(updated.name, 'Marque Test Modifiée');

    // 4. Duplicate ID Prevention
    const duplicateRes = await provider.create('brands', brand);
    assert.equal(duplicateRes.success, false);
    assert.ok(duplicateRes.error.includes('existe déjà'));

    // 5. Delete Brand
    const delRes = await provider.delete('brands', 'brd_test_unit');
    assert.equal(delRes.success, true);
    assert.equal(await provider.getById('brands', 'brd_test_unit'), null);
  });
});