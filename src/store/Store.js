'use strict';

/**
 * Abstract base class defining the storage interface.
 * Swap implementations (FileStore → PostgresStore, etc.) without touching command logic.
 */
class Store {
  async addEnvironment(name) {
    throw new Error('Not implemented');
  }

  async environmentExists(name) {
    throw new Error('Not implemented');
  }

  async listEnvironments() {
    throw new Error('Not implemented');
  }

  async addService(name, environment) {
    throw new Error('Not implemented');
  }

  async serviceExistsInEnvironment(name, environment) {
    throw new Error('Not implemented');
  }

  async listServices() {
    throw new Error('Not implemented');
  }

  async getConfig(service, environment) {
    throw new Error('Not implemented');
  }

  async setConfig(service, environment, key, value) {
    throw new Error('Not implemented');
  }

  async updateConfig(service, environment, data) {
    throw new Error('Not implemented');
  }
}

module.exports = Store;
