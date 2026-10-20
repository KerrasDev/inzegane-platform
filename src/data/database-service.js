/**
 * src/data/database-service.js
 * Inzegane Platform — Database Service
 *
 * This module provides a unified interface for interacting with different data providers.
 * It allows switching between providers, subscribing to data changes, and performing CRUD operations.
 */

import { LocalDatabaseProvider } from './providers/local-db-provider.js';
import { JsonCatalogProvider } from './providers/json-provider.js';
import { assertDataProvider } from './contracts.js';

const PROVIDER_FACTORIES = {
  json: (options) => new JsonCatalogProvider(options),
  local_storage: (options) => new LocalDatabaseProvider(options),
};

export class DatabaseService {
  constructor(provider = new LocalDatabaseProvider()) {
    this.provider = assertDataProvider(provider);
    this.listeners = new Set();
  }

  setProvider(provider, options = {}) {
    let nextProvider = provider;
    if (typeof provider === 'string') {
      const factory = PROVIDER_FACTORIES[provider];
      if (!factory) throw new Error(`Unknown data provider: ${provider}`);
      nextProvider = factory(options);
    }

    this.provider = assertDataProvider(nextProvider);
    this.notify();
  }

  async getSnapshot() {
    return this.provider.getSnapshot();
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
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
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
export const catalogDataService = new DatabaseService(new JsonCatalogProvider());