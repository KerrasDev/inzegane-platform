import { loadDatabase } from '../../database.js';
import { PRIMARY_KEYS, createOperationResult } from '../contracts.js';

const STORAGE_KEY_PREFIX = 'inzegane_db_';
const METADATA_STORAGE_KEY = 'inzegane_metadata';

export class LocalDatabaseProvider {
  constructor(options = {}) {
    this.name = 'Stockage Local Persistant (Durable)';
    this.baseUrl = options.baseUrl || '/';
    this.fetchImpl = options.fetchImpl || null;
    this._initialized = false;
    this._initPromise = null;
  }

  getCapabilities() {
    return {
      canWrite: true,
      canDelete: true,
      persistent: true,
      type: 'local_storage',
      name: this.name,
    };
  }

  async init() {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const isSeeded = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_seeded`);
      if (!isSeeded) {
        await this.resetToSeed();
      }
      this._initialized = true;
    })();

    return this._initPromise;
  }

  async resetToSeed() {
    let rawDb = null;
    try {
      const opts = { baseUrl: this.baseUrl };
      if (this.fetchImpl) opts.fetchImpl = this.fetchImpl;
      rawDb = await loadDatabase(opts);
    } catch {
      // Graceful fallback for test runners or offline environments without HTTP server
      rawDb = {};
    }

    for (const [key] of Object.entries(PRIMARY_KEYS)) {
      const records = (rawDb && rawDb[key]) || [];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(records));
    }
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify((rawDb && rawDb.metadata) || {}));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}is_seeded`, 'true');
    this._initialized = true;
  }

  _getCollection(resource) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${resource}`);
    return raw ? JSON.parse(raw) : [];
  }

  _saveCollection(resource, records) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${resource}`, JSON.stringify(records));
  }

  async list(resource, options = {}) {
    await this.init();
    const pk = PRIMARY_KEYS[resource];
    if (!pk) throw new Error(`Ressource inconnue: ${resource}`);

    let records = this._getCollection(resource);
    const total = records.length;

    if (options.query) {
      const q = options.query.toLowerCase().trim();
      records = records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }

    if (options.sortBy) {
      const dir = options.sortOrder === 'desc' ? -1 : 1;
      records.sort((a, b) => {
        const valA = a[options.sortBy] ?? '';
        const valB = b[options.sortBy] ?? '';
        return valA > valB ? dir : valA < valB ? -dir : 0;
      });
    }

    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 20));
    const start = (page - 1) * pageSize;
    const paginated = records.slice(start, start + pageSize);

    return {
      items: paginated,
      total,
      filteredTotal: records.length,
      page,
      pageSize,
      totalPages: Math.ceil(records.length / pageSize) || 1,
    };
  }

  async getById(resource, id) {
    await this.init();
    const pk = PRIMARY_KEYS[resource];
    const records = this._getCollection(resource);
    return records.find((r) => String(r[pk]) === String(id)) || null;
  }

  async create(resource, data) {
    await this.init();
    const pk = PRIMARY_KEYS[resource];
    const id = data[pk];

    if (!id || typeof id !== 'string') {
      return createOperationResult(false, null, `Le champ obligatoire "${pk}" est invalide.`);
    }

    const records = this._getCollection(resource);
    if (records.some((r) => r[pk] === id)) {
      return createOperationResult(false, null, `Un enregistrement avec l'identifiant "${id}" existe déjà.`);
    }

    records.unshift(data);
    this._saveCollection(resource, records);
    return createOperationResult(true, data);
  }

  async update(resource, id, data) {
    await this.init();
    const pk = PRIMARY_KEYS[resource];
    const records = this._getCollection(resource);
    const index = records.findIndex((r) => String(r[pk]) === String(id));

    if (index === -1) {
      return createOperationResult(false, null, `Enregistrement introuvable avec l'identifiant "${id}".`);
    }

    records[index] = { ...records[index], ...data, [pk]: id };
    this._saveCollection(resource, records);
    return createOperationResult(true, records[index]);
  }

  async delete(resource, id) {
    await this.init();
    const pk = PRIMARY_KEYS[resource];
    const records = this._getCollection(resource);
    const index = records.findIndex((r) => String(r[pk]) === String(id));

    if (index === -1) {
      return createOperationResult(false, null, `Enregistrement introuvable avec l'identifiant "${id}".`);
    }

    // Referential integrity check
    if (resource === 'products') {
      const offers = this._getCollection('offers');
      if (offers.some((o) => o.product_id === id)) {
        return createOperationResult(false, null, 'Suppression impossible : des offres actives font référence à ce produit.');
      }
    }
    if (resource === 'suppliers') {
      const offers = this._getCollection('offers');
      if (offers.some((o) => o.supplier_id === id)) {
        return createOperationResult(false, null, 'Suppression impossible : ce fournisseur est rattaché à des offres.');
      }
    }
    if (resource === 'categories') {
      const products = this._getCollection('products');
      if (products.some((p) => p.classification?.category_id === id)) {
        return createOperationResult(false, null, 'Suppression impossible : des produits sont rattachés à cette catégorie.');
      }
    }

    const [deleted] = records.splice(index, 1);
    this._saveCollection(resource, records);
    return createOperationResult(true, deleted);
  }

  async getMetadata() {
    await this.init();
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  async exportFullDatabase() {
    await this.init();
    const dump = {};
    for (const key of Object.keys(PRIMARY_KEYS)) {
      dump[key] = this._getCollection(key);
    }
    dump.metadata = await this.getMetadata();
    return dump;
  }
}