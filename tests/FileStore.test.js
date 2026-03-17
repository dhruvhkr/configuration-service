'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const FileStore = require('../src/store/FileStore');

function makeTempStore() {
  const file = path.join(os.tmpdir(), `config-test-${Date.now()}-${Math.random()}.json`);
  return { store: new FileStore(file), file };
}

afterEach(() => {
  // temp files are cleaned up by OS; explicit cleanup not required for tests
});

// ── environments ───────────────────────────────────────────────────────────

describe('FileStore – environments', () => {
  test('adds and lists an environment', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('staging');
    const envs = await store.listEnvironments();
    expect(envs).toContain('staging');
  });

  test('environmentExists returns true for known environment', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('dev');
    expect(await store.environmentExists('dev')).toBe(true);
  });

  test('environmentExists returns false for unknown environment', async () => {
    const { store } = makeTempStore();
    expect(await store.environmentExists('ghost')).toBe(false);
  });

  test('throws when adding a duplicate environment', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('prod');
    await expect(store.addEnvironment('prod')).rejects.toThrow(/already exists/);
  });

  test('persists data across store instances', async () => {
    const { store, file } = makeTempStore();
    await store.addEnvironment('production');

    const store2 = new FileStore(file);
    expect(await store2.environmentExists('production')).toBe(true);
  });
});

// ── services ───────────────────────────────────────────────────────────────

describe('FileStore – services', () => {
  test('adds and lists a service', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('dev');
    await store.addService('payment-service', 'dev');

    const services = await store.listServices();
    expect(services).toContainEqual(
      expect.objectContaining({ name: 'payment-service', environments: ['dev'] })
    );
  });

  test('throws when adding service to nonexistent environment', async () => {
    const { store } = makeTempStore();
    await expect(store.addService('svc', 'nowhere')).rejects.toThrow(/does not exist/);
  });

  test('throws when adding duplicate service-environment pair', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('staging');
    await store.addService('svc', 'staging');
    await expect(store.addService('svc', 'staging')).rejects.toThrow(/already registered/);
  });

  test('same service can exist in multiple environments', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('dev');
    await store.addEnvironment('prod');
    await store.addService('svc', 'dev');
    await store.addService('svc', 'prod');

    const services = await store.listServices();
    const svc = services.find((s) => s.name === 'svc');
    expect(svc.environments).toEqual(expect.arrayContaining(['dev', 'prod']));
  });

  test('serviceExistsInEnvironment returns correct boolean', async () => {
    const { store } = makeTempStore();
    await store.addEnvironment('dev');
    await store.addService('svc', 'dev');

    expect(await store.serviceExistsInEnvironment('svc', 'dev')).toBe(true);
    expect(await store.serviceExistsInEnvironment('svc', 'prod')).toBe(false);
    expect(await store.serviceExistsInEnvironment('other', 'dev')).toBe(false);
  });
});

// ── configs ────────────────────────────────────────────────────────────────

describe('FileStore – configs', () => {
  async function setupStore() {
    const { store, file } = makeTempStore();
    await store.addEnvironment('production');
    await store.addService('payment-service', 'production');
    return { store, file };
  }

  test('getConfig returns null when no config exists', async () => {
    const { store } = await setupStore();
    const result = await store.getConfig('payment-service', 'production');
    expect(result).toBeNull();
  });

  test('setConfig creates a config entry', async () => {
    const { store } = await setupStore();
    await store.setConfig('payment-service', 'production', 'timeout_seconds', 30);

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry).not.toBeNull();
    expect(entry.data.timeout_seconds).toBe(30);
    expect(entry.service).toBe('payment-service');
    expect(entry.environment).toBe('production');
    expect(entry.createdAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
  });

  test('setConfig updates an existing key without removing others', async () => {
    const { store } = await setupStore();
    await store.setConfig('payment-service', 'production', 'timeout_seconds', 30);
    await store.setConfig('payment-service', 'production', 'enable_logging', true);
    await store.setConfig('payment-service', 'production', 'timeout_seconds', 60);

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.timeout_seconds).toBe(60);
    expect(entry.data.enable_logging).toBe(true);
  });

  test('setConfig preserves createdAt on subsequent updates', async () => {
    const { store } = await setupStore();

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    await store.setConfig('payment-service', 'production', 'key', 'v1');
    const first = await store.getConfig('payment-service', 'production');

    jest.setSystemTime(new Date('2026-01-01T01:00:00.000Z'));
    await store.setConfig('payment-service', 'production', 'key', 'v2');
    const second = await store.getConfig('payment-service', 'production');
    jest.useRealTimers();

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
  });

  test('setConfig throws for unregistered service', async () => {
    const { store } = await setupStore();
    await expect(
      store.setConfig('unknown-service', 'production', 'key', 'val')
    ).rejects.toThrow(/not registered/);
  });

  test('updateConfig atomically merges multiple keys', async () => {
    const { store } = await setupStore();
    await store.updateConfig('payment-service', 'production', {
      timeout_seconds: 30,
      retry_attempts: 3,
      enable_logging: true,
      max_connections: 100,
    });

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data).toEqual({
      timeout_seconds: 30,
      retry_attempts: 3,
      enable_logging: true,
      max_connections: 100,
    });
  });

  test('updateConfig preserves keys not in the update payload', async () => {
    const { store } = await setupStore();
    await store.updateConfig('payment-service', 'production', { key_a: 'hello', key_b: 99 });
    await store.updateConfig('payment-service', 'production', { key_b: 42 });

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.key_a).toBe('hello');
    expect(entry.data.key_b).toBe(42);
  });

  test('updateConfig throws for unregistered service', async () => {
    const { store } = await setupStore();
    await expect(
      store.updateConfig('ghost-service', 'production', { key: 'val' })
    ).rejects.toThrow(/not registered/);
  });

  test('getConfig returns a defensive copy (mutations do not affect store)', async () => {
    const { store } = await setupStore();
    await store.setConfig('payment-service', 'production', 'key', 'original');

    const entry = await store.getConfig('payment-service', 'production');
    entry.data.key = 'mutated';

    const fresh = await store.getConfig('payment-service', 'production');
    expect(fresh.data.key).toBe('original');
  });
});
