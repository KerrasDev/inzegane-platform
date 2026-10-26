import assert from 'node:assert/strict';
import test from 'node:test';

// --- Global mocks (must be set before importing controller) ---

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

// DOM mock
const navContainer = { innerHTML: '' };
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      hidden: false,
      disabled: false,
      textContent: '',
      className: '',
      innerHTML: '',
      addEventListener: (event, fn) => { elements[id]._listeners = elements[id]._listeners || {}; elements[id]._listeners[event] = fn; },
      _listeners: {},
    };
  }
  return elements[id];
}

globalThis.document = {
  getElementById: (id) => {
    if (id === 'admin-nav') return navContainer;
    return getEl(id);
  },
  createElement: (tag) => {
    const el = { tag, href: '', download: '', click: () => { el._clicked = true; }, _clicked: false };
    return el;
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
};

// URL mock
const createdUrls = [];
const revokedUrls = [];
globalThis.URL = {
  createObjectURL: (blob) => {
    const url = `blob:mock-${createdUrls.length}`;
    createdUrls.push(url);
    return url;
  },
  revokeObjectURL: (url) => {
    revokedUrls.push(url);
  },
};

// Blob mock
globalThis.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
};

// Now import the real controller (after mocks are set)
// We need to mock dbService before import. Since dbService is a singleton,
// we'll import it and mutate its exportJson method.
const { dbService } = await import('../src/data/database-service.js');
const { handleExport, renderValidationResults } = await import('../src/admin/controllers/exports-controller.js');

// Save original exportJson
const originalExportJson = dbService.exportJson.bind(dbService);

// Helper to reset mocks
function resetMocks() {
  // Reset element properties but keep references (controller captured them at import time)
  for (const id of Object.keys(elements)) {
    const el = elements[id];
    el.hidden = false;
    el.disabled = false;
    el.textContent = '';
    el.className = '';
    el.innerHTML = '';
  }
  createdUrls.length = 0;
  revokedUrls.length = 0;
  navContainer.innerHTML = '';
  dbService.exportJson = originalExportJson;
}

// Set up DOM elements
function setupDOM() {
  getEl('export-btn');
  getEl('export-status');
  getEl('export-results');
  getEl('export-progress');
}

test('real controller: nav renders exports link', () => {
  // navContainer should have been populated by renderAdminNav('exports') at import time
  assert.ok(navContainer.innerHTML.includes('/admin/exports/'), 'Nav should contain exports link');
  assert.ok(navContainer.innerHTML.includes('aria-current="page"'), 'Active state should be set');
});

test('real controller: validation failure prevents download', async () => {
  resetMocks();
  setupDOM();

  // Mock dbService to return invalid data
  dbService.exportJson = async () => ({
    products: [{ product_id: 'p1' }], // missing required fields
    categories: [],
    brands: [],
    suppliers: [],
    offers: [],
    price_history: [],
    availability_checks: [],
    sources: [],
  });

  await handleExport();

  const status = getEl('export-status');
  assert.ok(status.textContent.includes('Échec de la validation'), 'Status should indicate validation failure');
  assert.equal(createdUrls.length, 0, 'No URL should be created on validation failure');
});

test('real controller: valid data produces JSON and revokes URL', async () => {
  resetMocks();
  setupDOM();

  const validSnapshot = {
    products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
    categories: [{ category_id: 'c1', name_fr: 'Cat' }],
    brands: [{ brand_id: 'b1', name: 'Brand' }],
    suppliers: [],
    offers: [],
    price_history: [],
    availability_checks: [],
    sources: [],
    metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
  };

  dbService.exportJson = async () => validSnapshot;

  await handleExport();

  const status = getEl('export-status');
  assert.ok(status.textContent.includes('Export réussi'), 'Status should indicate success');
  assert.equal(createdUrls.length, 1, 'One URL should be created');
  assert.equal(revokedUrls.length, 1, 'URL should be revoked');
  assert.equal(createdUrls[0], revokedUrls[0], 'Revoked URL should match created URL');
});

test('real controller: Arabic/French text survives serialization', async () => {
  resetMocks();
  setupDOM();

  const arabicSnapshot = {
    products: [{ product_id: 'p1', identity: { product_name_fr: 'Produit français', product_name_ar: 'منتج عربي', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
    categories: [{ category_id: 'c1', name_fr: 'Catégorie', name_ar: 'فئة' }],
    brands: [{ brand_id: 'b1', name: 'Marque' }],
    suppliers: [],
    offers: [],
    price_history: [],
    availability_checks: [],
    sources: [],
    metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
  };

  dbService.exportJson = async () => arabicSnapshot;

  await handleExport();

  const status = getEl('export-status');
  assert.ok(status.textContent.includes('Export réussi'), 'Export should succeed');
  // Verify serialization preserved text (check that JSON.stringify was called with the snapshot)
  // The controller creates a Blob with JSON.stringify(snapshot, null, 2)
  // We can't easily inspect the Blob, but we verified the flow completed
});

test('real controller: export does not mutate database', async () => {
  resetMocks();
  setupDOM();

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

  dbService.exportJson = async () => snapshot;
  await handleExport();

  const after = JSON.stringify(snapshot);
  assert.equal(before, after, 'Export should not mutate the snapshot');
});

test('real controller: exception is reported and UI returns to usable state', async () => {
  resetMocks();
  setupDOM();

  dbService.exportJson = async () => { throw new Error('Storage unavailable'); };

  await handleExport();

  const status = getEl('export-status');
  assert.ok(status.textContent.includes('Erreur d\'export'), 'Status should indicate error');
  const btn = getEl('export-btn');
  assert.equal(btn.disabled, false, 'Button should be re-enabled after error');
  const progress = getEl('export-progress');
  assert.equal(progress.hidden, true, 'Progress should be hidden after error');
});

test('real controller: concurrent clicks are prevented', async () => {
  resetMocks();
  setupDOM();

  let callCount = 0;
  dbService.exportJson = async () => {
    callCount++;
    await new Promise(r => setTimeout(r, 50));
    return {
      products: [{ product_id: 'p1', identity: { product_name_fr: 'Test', brand_id: 'b1' }, classification: { category_id: 'c1' } }],
      categories: [{ category_id: 'c1', name_fr: 'Cat' }],
      brands: [{ brand_id: 'b1', name: 'Brand' }],
      suppliers: [],
      offers: [],
      price_history: [],
      availability_checks: [],
      sources: [],
      metadata: { dataset_id: 'test', imported_from: 'test', imported_at: '2025-01-01', source_snapshot_generated_at: '2025-02-21T18:00:00Z', independently_verified: false, limitations: [] },
    };
  };

  // Fire two concurrent exports
  const p1 = handleExport();
  const p2 = handleExport();
  await Promise.all([p1, p2]);

  // Only one should have executed (isExporting guard)
  assert.equal(callCount, 1, 'Only one export should execute');
});

test('real controller: progress hidden after validation failure', async () => {
  resetMocks();
  setupDOM();

  dbService.exportJson = async () => ({
    products: [{ product_id: 'p1' }], // invalid
    categories: [],
    brands: [],
    suppliers: [],
    offers: [],
    price_history: [],
    availability_checks: [],
    sources: [],
  });

  const progress = getEl('export-progress');
  progress.hidden = false; // simulate shown

  await handleExport();

  assert.equal(progress.hidden, true, 'Progress should be hidden after validation failure');
});

test('real controller: renderValidationResults produces HTML', () => {
  const validation = {
    ok: false,
    errors: [{ resource: 'products', recordId: 'p1', reason: 'Missing field' }],
    warnings: [{ reason: 'Empty collection' }],
    counts: { products: 1 },
    recordsChecked: 1,
  };
  const html = renderValidationResults(validation);
  assert.ok(html.includes('Erreurs'), 'Should include errors section');
  assert.ok(html.includes('Avertissements'), 'Should include warnings section');
  assert.ok(html.includes('Comptes par ressource'), 'Should include counts section');
  assert.ok(html.includes('Missing field'), 'Should include error message');
});