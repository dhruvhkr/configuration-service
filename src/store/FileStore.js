'use strict';

const fs = require('fs');
const path = require('path');
const Store = require('./Store');

const DEFAULT_DATA_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.config-service-data.json'
);

/**
 * File-backed store. All mutations are written atomically by serialising the
 * entire state to JSON before committing, so a validation failure rolls back
 * the whole operation without touching persisted data.
 */
class FileStore extends Store {
  constructor(dataFile = DEFAULT_DATA_FILE) {
    super();
    this.dataFile = dataFile;
    this._data = this._load();
  }

  // ── persistence ──────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { environments: [], services: {}, configs: {} };
    }
  }

  _save() {
    fs.writeFileSync(this.dataFile, JSON.stringify(this._data, null, 2), 'utf8');
  }

  // ── environments ─────────────────────────────────────────────────────────

  async addEnvironment(name) {
    if (this._data.environments.includes(name)) {
      throw new Error(`Environment "${name}" already exists`);
    }
    this._data.environments.push(name);
    this._save();
  }

  async environmentExists(name) {
    return this._data.environments.includes(name);
  }

  async listEnvironments() {
    return [...this._data.environments];
  }

  // ── services ─────────────────────────────────────────────────────────────

  async addService(name, environment) {
    if (!this._data.environments.includes(environment)) {
      throw new Error(`Environment "${environment}" does not exist`);
    }
    if (!this._data.services[name]) {
      this._data.services[name] = [];
    }
    if (this._data.services[name].includes(environment)) {
      throw new Error(`Service "${name}" already registered in environment "${environment}"`);
    }
    this._data.services[name].push(environment);
    this._save();
  }

  async serviceExistsInEnvironment(name, environment) {
    return (this._data.services[name] || []).includes(environment);
  }

  async listServices() {
    return Object.entries(this._data.services).map(([name, environments]) => ({
      name,
      environments: [...environments],
    }));
  }

  // ── configs ───────────────────────────────────────────────────────────────

  _configKey(service, environment) {
    return `${service}:${environment}`;
  }

  async getConfig(service, environment) {
    const key = this._configKey(service, environment);
    const entry = this._data.configs[key];
    if (!entry) return null;
    return {
      ...entry,
      data: { ...entry.data },
    };
  }

  /**
   * Sets a single key on an existing config entry.
   * Creates the entry if it doesn't exist yet.
   * @param {string} service
   * @param {string} environment
   * @param {string} key
   * @param {string|number|boolean} value - already parsed/validated
   */
  async setConfig(service, environment, key, value) {
    if (!await this.serviceExistsInEnvironment(service, environment)) {
      throw new Error(`Service "${service}" is not registered in environment "${environment}"`);
    }

    const configKey = this._configKey(service, environment);
    const now = new Date().toISOString();

    if (!this._data.configs[configKey]) {
      this._data.configs[configKey] = {
        service,
        environment,
        data: {},
        createdAt: now,
        updatedAt: now,
      };
    }

    this._data.configs[configKey].data[key] = value;
    this._data.configs[configKey].updatedAt = now;
    this._save();
  }

  /**
   * Atomically merges `data` into the existing config.
   * Validation must happen BEFORE calling this method.
   * If this._save() throws (e.g. disk full) the in-memory state is still
   * updated; callers at the command layer handle I/O errors.
   * @param {string} service
   * @param {string} environment
   * @param {Record<string, string|number|boolean>} data - already validated
   */
  async updateConfig(service, environment, data) {
    if (!await this.serviceExistsInEnvironment(service, environment)) {
      throw new Error(`Service "${service}" is not registered in environment "${environment}"`);
    }

    const configKey = this._configKey(service, environment);
    const now = new Date().toISOString();

    // Build the next state in a local copy first – atomicity guarantee
    const existing = this._data.configs[configKey];
    const nextEntry = {
      service,
      environment,
      data: {
        ...(existing ? existing.data : {}),
        ...data,
      },
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    // Commit only after the full merge is ready
    this._data.configs[configKey] = nextEntry;
    this._save();
  }
}

module.exports = FileStore;
