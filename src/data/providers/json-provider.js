import { loadDatabase } from '../../database.js';
import { PRIMARY_KEYS, createOperationResult } from '../contracts.js';

export class JsonCatalogProvider {
  constructor(options = {}) {
    this.name = 'Catalogue Statique JSON (Lecture seule)';
    this.baseUrl = options.baseUrl || '/';
    this.fetchImpl = options.fetchImpl || null;
    this._cachedDb = null;
  }

  getCapabilities() {
    return {
      canWrite: false,
      canDelete: false,
      persistent: false,
      type: 'static_json',
      name: this.name,
    };
  }

  async _getDatabase() {
    if (!this._cachedDb) {
      const opts = { baseUrl: this.baseUrl };
      if (this.fetchImpl) opts.fetchImpl = this.fetchImpl;
      this._cachedDb = await loadDatabase(opts);
    }
    return this._cachedDb;
  }

  async list(resource, options = {}) {
    const db = await this._getDatabase();
    const pk = PRIMARY_KEYS[resource];
    if (!pk || !Array.isArray(db[resource])) {
      throw new Error(`Ressource inconnue: ${resource}`);
    }

    let records = db[resource];
    const total = records.length;

    if (options.query) {
      const q = options.query.toLowerCase().trim();
      records = records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }

    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 20));
    const start = (page - 1) * pageSize;

    return {
      items: records.slice(start, start + pageSize),
      total,
      filteredTotal: records.length,
      page,
      pageSize,
      totalPages: Math.ceil(records.length / pageSize) || 1,
    };
  }

  async getById(resource, id) {
    const db = await this._getDatabase();
    const pk = PRIMARY_KEYS[resource];
    return db[resource]?.find((r) => String(r[pk]) === String(id)) || null;
  }

  async create() {
    return createOperationResult(false, null, 'Lecture seule : le fournisseur JSON statique ne prend pas en charge la création.');
  }

  async update() {
    return createOperationResult(false, null, 'Lecture seule : le fournisseur JSON statique ne prend pas en charge la modification.');
  }

  async delete() {
    return createOperationResult(false, null, 'Lecture seule : le fournisseur JSON statique ne prend pas en charge la suppression.');
  }

  async getMetadata() {
    const db = await this._getDatabase();
    return db.metadata || {};
  }
}