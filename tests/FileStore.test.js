const fs = require('fs');
const path = require('path');
const FileStore = require('../src/store/FileStore');

const TEST_FILE = path.join(__dirname, 'test-store.json');

let store;

beforeEach(() => {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  store = new FileStore(TEST_FILE);
});

afterAll(() => {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
});

describe('Environments', () => {
  test('adds and lists environments', () => {
    store.addEnvironment('dev');
    store.addEnvironment('staging');
    expect(store.listEnvironments()).toEqual(['dev', 'staging']);
  });

  test('throws if environment already exists', () => {
    store.addEnvironment('dev');
    expect(() => store.addEnvironment('dev')).toThrow('Environment "dev" already exists');
  });

  test('environmentExists returns true/false correctly', () => {
    store.addEnvironment('production');
    expect(store.environmentExists('production')).toBe(true);
    expect(store.environmentExists('staging')).toBe(false);
  });
});

describe('Services', () => {
  beforeEach(() => {
    store.addEnvironment('dev');
    store.addEnvironment('staging');
  });

  test('adds a service to an environment', () => {
    store.addService('payment-service', 'dev');
    expect(store.serviceExistsInEnvironment('payment-service', 'dev')).toBe(true);
  });

  test('throws if environment does not exist', () => {
    expect(() => store.addService('payment-service', 'production')).toThrow(
      'Environment "production" does not exist'
    );
  });

  test('throws if service already registered in environment', () => {
    store.addService('user-service', 'dev');
    expect(() => store.addService('user-service', 'dev')).toThrow(
      'Service "user-service" already registered in environment "dev"'
    );
  });

  test('lists all services with their environments', () => {
    store.addService('payment-service', 'dev');
    store.addService('payment-service', 'staging');
    store.addService('user-service', 'dev');
    const services = store.listServices();
    expect(services).toHaveLength(2);
    expect(services.find(s => s.name === 'payment-service').environments).toEqual(['dev', 'staging']);
  });
});

describe('Configs', () => {
  beforeEach(() => {
    store.addEnvironment('production');
    store.addService('payment-service', 'production');
  });

  test('sets and gets a single config key', () => {
    store.setConfig('payment-service', 'production', 'timeout_seconds', 30);
    const config = store.getConfig('payment-service', 'production');
    expect(config.data.timeout_seconds).toBe(30);
    expect(config.service).toBe('payment-service');
    expect(config.environment).toBe('production');
  });

  test('set-config creates timestamps on first set', () => {
    store.setConfig('payment-service', 'production', 'enabled', true);
    const config = store.getConfig('payment-service', 'production');
    expect(config.createdAt).toBeDefined();
    expect(config.updatedAt).toBeDefined();
  });

  test('update-config merges data atomically', () => {
    store.setConfig('payment-service', 'production', 'timeout_seconds', 30);
    store.updateConfig('payment-service', 'production', { retry_attempts: 3, enable_logging: true });
    const config = store.getConfig('payment-service', 'production');
    expect(config.data.timeout_seconds).toBe(30);
    expect(config.data.retry_attempts).toBe(3);
    expect(config.data.enable_logging).toBe(true);
  });

  test('throws if service not registered when setting config', () => {
    expect(() =>
      store.setConfig('unknown-service', 'production', 'key', 'val')
    ).toThrow('Service "unknown-service" is not registered in environment "production"');
  });

  test('returns null for config that does not exist', () => {
    expect(store.getConfig('payment-service', 'production')).toBeNull();
  });

  test('persists data to file', () => {
    store.setConfig('payment-service', 'production', 'max_connections', 100);
    const store2 = new FileStore(TEST_FILE);
    const config = store2.getConfig('payment-service', 'production');
    expect(config.data.max_connections).toBe(100);
  });
});
