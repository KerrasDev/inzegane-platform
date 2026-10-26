import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

// --- Global mocks (must be set before importing) ---

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

// Mock DOM container with querySelector support
const containerEl = {
  innerHTML: '',
  _qs: {},
  querySelector: (sel) => {
    if (!containerEl._qs[sel]) {
      containerEl._qs[sel] = {
        innerHTML: '',
        textContent: '',
        value: '',
        addEventListener: () => {},
        querySelector: (s) => containerEl._qs[s] || { innerHTML: '', textContent: '', addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
        querySelectorAll: (s) => [],
        showModal: () => {},
        close: () => {},
      };
    }
    return containerEl._qs[sel];
  },
  querySelectorAll: (sel) => [],
};

globalThis.document = {
  getElementById: (id) => (id === 'database-explorer-root' ? containerEl : null),
  createElement: (tag) => ({ tag, href: '', download: '', click: () => {}, _clicked: false }),
  body: { appendChild: () => {}, removeChild: () => {} },
};

globalThis.URL = {
  createObjectURL: () => 'blob:mock',
  revokeObjectURL: () => {},
};

globalThis.Blob = class Blob {
  constructor(parts, options) { this.parts = parts; this.options = options; }
};

// Mock dbService
const mockDbService = {
  _listeners: [],
  subscribe: (cb) => { mockDbService._listeners.push(cb); return () => {}; },
  getCapabilities: () => ({ canWrite: true, canDelete: true, persistent: true, type: 'local_storage', name: 'Test Provider' }),
  list: async (res, opts) => ({
    items: [],
    total: 0,
    filteredTotal: 0,
    page: 1,
    pageSize: opts?.pageSize || 15,
    totalPages: 1,
  }),
  getById: async (res, id) => null,
  create: async (res, data) => ({ success: true, data }),
  update: async (res, id, data) => ({ success: true, data }),
  delete: async (res, id) => ({ success: true, data: { id } }),
  resetSeed: async () => {},
  exportJson: async () => ({ products: [], categories: [], brands: [], suppliers: [], offers: [], price_history: [], availability_checks: [], sources: [], research_summary: {}, metadata: {} }),
};

const dbServiceModule = await import('../src/data/database-service.js');
Object.assign(dbServiceModule.dbService, mockDbService);

const { DatabaseExplorer } = await import('../src/admin/database-explorer.js');

function resetContainer() {
  containerEl.innerHTML = '';
  containerEl._qs = {};
}

// Helper to wait for async init to complete
async function createExplorer(resource = 'products') {
  resetContainer();
  const explorer = new DatabaseExplorer('database-explorer-root', { defaultResource: resource });
  // Wait for async init (loadRelations + loadData)
  await new Promise(r => setTimeout(r, 50));
  return explorer;
}

test('DatabaseExplorer renders table headers with scope="col"', async () => {
  const explorer = await createExplorer('products');
  const thead = containerEl.querySelector('#explorer-thead');
  assert.ok(thead.innerHTML.includes('scope="col"'), 'Table headers should have scope="col"');
});

test('DatabaseExplorer renders tab buttons with aria-current on active', async () => {
  const explorer = await createExplorer('products');
  assert.ok(containerEl.innerHTML.includes('aria-current="page"'), 'Active tab should have aria-current');
});

test('DatabaseExplorer renders dialog with aria-modal and aria-labelledby', async () => {
  const explorer = await createExplorer('products');
  assert.ok(containerEl.innerHTML.includes('aria-modal="true"'), 'Dialog should have aria-modal');
  assert.ok(containerEl.innerHTML.includes('aria-labelledby="modal-title"'), 'Dialog should have aria-labelledby');
});

test('DatabaseExplorer tab buttons have data-resource attribute', async () => {
  const explorer = await createExplorer('products');
  assert.ok(containerEl.innerHTML.includes('data-resource="products"'), 'Tab should have data-resource');
});

test('DatabaseExplorer source uses escapeHtml for cell values', () => {
  const source = fs.readFileSync('src/admin/database-explorer.js', 'utf8');
  assert.ok(source.includes('escapeHtml(val)'), 'Cell values should be escaped');
  assert.ok(source.includes('escapeHtml(id)'), 'Button data-id should be escaped');
  assert.ok(source.includes('escapeHtml(c.label)'), 'Header labels should be escaped');
  assert.ok(source.includes('escapeHtml(schema.title)'), 'Schema titles should be escaped');
});

test('DatabaseExplorer renders JSON inspection as textContent', () => {
  const source = fs.readFileSync('src/admin/database-explorer.js', 'utf8');
  assert.ok(source.includes("modalBody.querySelector('.json-dump').textContent"), 'JSON should use textContent');
  assert.ok(!source.includes('<pre class="json-dump">${JSON.stringify'), 'JSON should not use innerHTML with JSON.stringify');
});

test('DatabaseExplorer invalidates relationsCache after mutations (source check)', () => {
  const source = fs.readFileSync('src/admin/database-explorer.js', 'utf8');
  const matches = source.match(/await this\.loadRelations\(\);/g);
  assert.ok(matches && matches.length >= 3, 'loadRelations should be called in at least 3 places');
});

test('DatabaseExplorer export uses validateExport (source check)', () => {
  const source = fs.readFileSync('src/admin/database-explorer.js', 'utf8');
  assert.ok(source.includes('validateExport(dump)'), 'Export should use validateExport');
  assert.ok(source.includes("this.showAlert('Export annulé"), 'Export should show alert on validation failure');
});

test('DatabaseExplorer empty state renders message', async () => {
  const explorer = await createExplorer('products');
  const tbody = containerEl.querySelector('#explorer-tbody');
  assert.ok(tbody.innerHTML.includes('Aucun enregistrement trouvé'), 'Empty state should show message');
});