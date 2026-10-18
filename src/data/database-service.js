import { LocalDatabaseProvider } from './providers/local-db-provider.js';
import { JsonCatalogProvider } from './providers/json-provider.js';

class DatabaseService {
  constructor() {
    this.provider = new LocalDatabaseProvider();
    this.listeners = new Set();
  }

  setProvider(type, options = {}) {
    if (type === 'json') {
      this.provider = new JsonCatalogProvider(options);
    } else {
      this.provider = new LocalDatabaseProvider(options);
    }
    this.notify();
  }

  getCapabilities() {
    return this.provider.getCapabilities();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      try { listener(); } catch (e) { console.error(e); }
    }
  }

  async list(resource, options) {
    return this.provider.list(resource, options);
  }

  async getById(resource, id) {
    return this.provider.getById(resource, id);
  }

  async create(resource, data) {
    const res = await this.provider.create(resource, data);
    if (res.success) this.notify();
    return res;
  }

  async update(resource, id, data) {
    const res = await this.provider.update(resource, id, data);
    if (res.success) this.notify();
    return res;
  }

  async delete(resource, id) {
    const res = await this.provider.delete(resource, id);
    if (res.success) this.notify();
    return res;
  }

  async getMetadata() {
    return this.provider.getMetadata();
  }

  async resetSeed() {
    if (typeof this.provider.resetToSeed === 'function') {
      await this.provider.resetToSeed();
      this.notify();
      return true;
    }
    return false;
  }

  async exportJson() {
    if (typeof this.provider.exportFullDatabase === 'function') {
      return this.provider.exportFullDatabase();
    }
    return null;
  }
}

export const dbService = new DatabaseService();