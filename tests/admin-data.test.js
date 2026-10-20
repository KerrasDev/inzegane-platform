import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { describe } from 'node:test';
import { LocalDatabaseProvider } from '../src/data/providers/local-db-provider.js';
import { JsonCatalogProvider } from '../src/data/providers/json-provider.js';
import { DatabaseService, dbService } from '../src/data/database-service.js';
import { loadAdminData } from '../src/admin.js';

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
    localStorage.clear();
    const provider = new LocalDatabaseProvider({ fetchImpl: createSeedFetch() });

    // 1. Create Brand
    const brand = { brand_id: 'brd_test_unit', name: 'Marque Test' };
    const createBrand = await provider.create('brands', brand);
    assert.equal(createBrand.success, true);

    // 2. Read Brand
    const retrieved = await provider.getById('brands', 'brd_test_unit');
    assert.equal(retrieved.name, 'Marque Test');
    assert.equal((await provider.getSnapshot()).research_summary.database_version, '1.0.0-rc1');

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

  test('DatabaseService delegates snapshots and rejects invalid provider selections', async () => {
    const provider = new JsonCatalogProvider({ fetchImpl: createSeedFetch() });
    const service = new DatabaseService(provider);

    const snapshot = await service.getSnapshot();
    assert.equal(snapshot.products.length, 7);
    assert.equal(service.getCapabilities().type, 'static_json');
    assert.throws(() => service.setProvider('unknown'), /Unknown data provider/);
    assert.throws(() => service.setProvider({}), /Invalid data provider/);
    assert.equal(service.getCapabilities().type, 'static_json');
  });

  test('admin data loads through the selected provider and merges staged IDs with resource keys', async () => {
    localStorage.clear();
    dbService.setProvider(new JsonCatalogProvider({ fetchImpl: createSeedFetch() }));
    localStorage.setItem(
      'inzegane_staged_products',
      JSON.stringify([{ id: 'prd_cbl_hoco_x14_c', name: 'Produit brouillon' }]),
    );

    try {
      const data = await loadAdminData();
      const product = data.products.find((item) => item.product_id === 'prd_cbl_hoco_x14_c');

      assert.equal(product.name, 'Produit brouillon');
      assert.equal(product.id, 'prd_cbl_hoco_x14_c');
      assert.equal(data.products.length, 7);
    } finally {
      localStorage.clear();
      dbService.setProvider(new LocalDatabaseProvider({ fetchImpl: createSeedFetch() }));
    }
  });

  test('LocalDatabaseProvider surfaces seed-load failures instead of initializing empty data', async () => {
    localStorage.clear();
    const provider = new LocalDatabaseProvider({
      fetchImpl: async () => {
        throw new Error('seed unavailable');
      },
    });

    await assert.rejects(provider.init(), /seed unavailable/);
    assert.equal(localStorage.getItem('inzegane_db_is_seeded'), null);
  });
});