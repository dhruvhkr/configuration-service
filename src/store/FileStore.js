const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'store.json');

class FileStore {
  constructor(filePath = DEFAULT_FILE) {
    this._filePath = filePath;
    this._data = { environments: [], services: {}, configs: {} };
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      this._data = JSON.parse(raw);
    } catch {
      this._data = { environments: [], services: {}, configs: {} };
    }
  }

  _persist() {
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2));
  }

  // Environments
  addEnvironment(name) {
    if (this._data.environments.includes(name)) {
      throw new Error(`Environment "${name}" already exists`);
    }
    this._data.environments.push(name);
    this._persist();
  }

  environmentExists(name) {
    return this._data.environments.includes(name);
  }

  listEnvironments() {
    return [...this._data.environments];
  }

  // Services
  addService(name, environment) {
    if (!this.environmentExists(environment)) {
      throw new Error(`Environment "${environment}" does not exist`);
    }
    if (!this._data.services[name]) {
      this._data.services[name] = [];
    }
    if (this._data.services[name].includes(environment)) {
      throw new Error(`Service "${name}" already registered in environment "${environment}"`);
    }
    this._data.services[name].push(environment);
    this._persist();
  }

  serviceExistsInEnvironment(name, environment) {
    return !!(this._data.services[name] && this._data.services[name].includes(environment));
  }

  listServices() {
    return Object.entries(this._data.services).map(([name, environments]) => ({
      name,
      environments,
    }));
  }

  // Configs
  getConfig(service, environment) {
    const key = `${service}:${environment}`;
    return this._data.configs[key] || null;
  }

  setConfig(service, environment, key, value) {
    if (!this.serviceExistsInEnvironment(service, environment)) {
      throw new Error(`Service "${service}" is not registered in environment "${environment}"`);
    }
    const storeKey = `${service}:${environment}`;
    const existing = this._data.configs[storeKey];
    if (existing) {
      existing.data[key] = value;
      existing.updatedAt = new Date().toISOString();
    } else {
      this._data.configs[storeKey] = {
        service,
        environment,
        data: { [key]: value },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    this._persist();
  }

  updateConfig(service, environment, data) {
    if (!this.serviceExistsInEnvironment(service, environment)) {
      throw new Error(`Service "${service}" is not registered in environment "${environment}"`);
    }
    const storeKey = `${service}:${environment}`;
    const existing = this._data.configs[storeKey];
    if (existing) {
      existing.data = { ...existing.data, ...data };
      existing.updatedAt = new Date().toISOString();
    } else {
      this._data.configs[storeKey] = {
        service,
        environment,
        data: { ...data },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    this._persist();
  }
}

module.exports = FileStore;
