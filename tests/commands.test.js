'use strict';

/**
 * Integration tests for command handlers.
 * We wire real command registrations against an in-memory FileStore (using
 * a temp file) so the full command → store → response path is exercised.
 */

const os = require('os');
const path = require('path');
const { Command } = require('commander');
const FileStore = require('../src/store/FileStore');
const { registerEnvironmentCommands } = require('../src/commands/environment');
const { registerServiceCommands } = require('../src/commands/service');
const { registerConfigCommands } = require('../src/commands/config');

function makeProgramWithStore() {
  const file = path.join(os.tmpdir(), `cmd-test-${Date.now()}-${Math.random()}.json`);
  const store = new FileStore(file);
  const program = new Command();
  program.exitOverride(); // prevents process.exit() calls in tests
  registerEnvironmentCommands(program, store);
  registerServiceCommands(program, store);
  registerConfigCommands(program, store);
  return { program, store };
}

async function run(program, ...args) {
  const output = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...a) => output.push(a.join(' '));
  console.error = (...a) => errors.push(a.join(' '));

  let exitCode = 0;
  const originalExitCode = Object.getOwnPropertyDescriptor(process, 'exitCode');
  Object.defineProperty(process, 'exitCode', {
    get: () => exitCode,
    set: (v) => { exitCode = v; },
    configurable: true,
  });

  try {
    await program.parseAsync(['node', 'config', ...args]);
  } catch {
    // commander throws on exitOverride
  } finally {
    console.log = originalLog;
    console.error = originalError;
    if (originalExitCode) {
      Object.defineProperty(process, 'exitCode', originalExitCode);
    } else {
      delete process.exitCode;
    }
  }

  return { output: output.join('\n'), errors: errors.join('\n'), exitCode };
}

// ── add-environment ────────────────────────────────────────────────────────

describe('add-environment command', () => {
  test('adds a new environment and confirms', async () => {
    const { program } = makeProgramWithStore();
    const { output, exitCode } = await run(program, 'add-environment', 'staging');
    expect(output).toMatch(/staging/);
    expect(exitCode).toBe(0);
  });

  test('reports error on duplicate environment', async () => {
    const { program } = makeProgramWithStore();
    await run(program, 'add-environment', 'dev');
    const { errors, exitCode } = await run(program, 'add-environment', 'dev');
    expect(errors).toMatch(/already exists/i);
    expect(exitCode).toBe(1);
  });

  test('rejects invalid environment name', async () => {
    const { program } = makeProgramWithStore();
    const { errors, exitCode } = await run(program, 'add-environment', 'my env!');
    expect(errors).toMatch(/invalid/i);
    expect(exitCode).toBe(1);
  });
});

// ── add-service ────────────────────────────────────────────────────────────

describe('add-service command', () => {
  test('registers a service in a known environment', async () => {
    const { program } = makeProgramWithStore();
    await run(program, 'add-environment', 'production');
    const { output, exitCode } = await run(program, 'add-service', 'payment-service', 'production');
    expect(output).toMatch(/payment-service/);
    expect(output).toMatch(/production/);
    expect(exitCode).toBe(0);
  });

  test('rejects service in unknown environment', async () => {
    const { program } = makeProgramWithStore();
    const { errors, exitCode } = await run(program, 'add-service', 'svc', 'nowhere');
    expect(errors).toMatch(/does not exist/i);
    expect(exitCode).toBe(1);
  });
});

// ── list-services ──────────────────────────────────────────────────────────

describe('list-services command', () => {
  test('shows all services and their environments', async () => {
    const { program } = makeProgramWithStore();
    await run(program, 'add-environment', 'dev');
    await run(program, 'add-environment', 'prod');
    await run(program, 'add-service', 'user-service', 'dev');
    await run(program, 'add-service', 'user-service', 'prod');

    const { output } = await run(program, 'list-services');
    expect(output).toMatch(/user-service/);
    expect(output).toMatch(/dev/);
    expect(output).toMatch(/prod/);
  });

  test('shows helpful message when no services exist', async () => {
    const { program } = makeProgramWithStore();
    const { output } = await run(program, 'list-services');
    expect(output).toMatch(/no services/i);
  });
});

// ── set-config ─────────────────────────────────────────────────────────────

describe('set-config command', () => {
  async function preparedProgram() {
    const pw = makeProgramWithStore();
    await run(pw.program, 'add-environment', 'production');
    await run(pw.program, 'add-service', 'payment-service', 'production');
    return pw;
  }

  test('sets a string config value', async () => {
    const { program, store } = await preparedProgram();
    await run(program, 'set-config', 'payment-service', 'production', 'gateway_url', 'https://api.example.com');

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.gateway_url).toBe('https://api.example.com');
  });

  test('sets a numeric config value parsed from string', async () => {
    const { program, store } = await preparedProgram();
    await run(program, 'set-config', 'payment-service', 'production', 'timeout_seconds', '30');

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.timeout_seconds).toBe(30);
    expect(typeof entry.data.timeout_seconds).toBe('number');
  });

  test('sets a boolean config value', async () => {
    const { program, store } = await preparedProgram();
    await run(program, 'set-config', 'payment-service', 'production', 'enable_logging', 'true');

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.enable_logging).toBe(true);
    expect(typeof entry.data.enable_logging).toBe('boolean');
  });

  test('reports error for unregistered service', async () => {
    const { program } = await preparedProgram();
    const { errors, exitCode } = await run(
      program, 'set-config', 'ghost', 'production', 'key', 'val'
    );
    expect(errors).toMatch(/not registered/i);
    expect(exitCode).toBe(1);
  });
});

// ── update-config ──────────────────────────────────────────────────────────

describe('update-config command', () => {
  async function preparedProgram() {
    const pw = makeProgramWithStore();
    await run(pw.program, 'add-environment', 'production');
    await run(pw.program, 'add-service', 'payment-service', 'production');
    return pw;
  }

  test('atomically updates multiple keys', async () => {
    const { program, store } = await preparedProgram();
    const payload = JSON.stringify({
      timeout_seconds: 30,
      retry_attempts: 3,
      enable_logging: true,
      max_connections: 100,
    });
    const { exitCode } = await run(program, 'update-config', 'payment-service', 'production', payload);
    expect(exitCode).toBe(0);

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.timeout_seconds).toBe(30);
    expect(entry.data.retry_attempts).toBe(3);
    expect(entry.data.enable_logging).toBe(true);
    expect(entry.data.max_connections).toBe(100);
  });

  test('rejects invalid JSON and makes no changes', async () => {
    const { program, store } = await preparedProgram();
    await run(program, 'set-config', 'payment-service', 'production', 'existing_key', 'original');

    const { errors, exitCode } = await run(
      program, 'update-config', 'payment-service', 'production', '{bad json}'
    );
    expect(errors).toMatch(/invalid json/i);
    expect(exitCode).toBe(1);

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.existing_key).toBe('original');
  });

  test('rejects nested objects and makes no changes', async () => {
    const { program, store } = await preparedProgram();
    await run(program, 'set-config', 'payment-service', 'production', 'safe_key', 'safe_value');

    const { errors, exitCode } = await run(
      program,
      'update-config',
      'payment-service',
      'production',
      JSON.stringify({ nested: { bad: true } })
    );
    expect(errors).toMatch(/validation/i);
    expect(exitCode).toBe(1);

    const entry = await store.getConfig('payment-service', 'production');
    expect(entry.data.safe_key).toBe('safe_value');
    expect(entry.data.nested).toBeUndefined();
  });
});

// ── get-config ─────────────────────────────────────────────────────────────

describe('get-config command', () => {
  test('displays config when it exists', async () => {
    const { program } = makeProgramWithStore();
    await run(program, 'add-environment', 'dev');
    await run(program, 'add-service', 'user-service', 'dev');
    await run(program, 'update-config', 'user-service', 'dev', JSON.stringify({ key: 'value' }));

    const { output } = await run(program, 'get-config', 'user-service', 'dev');
    expect(output).toMatch(/user-service/);
    expect(output).toMatch(/key/);
    expect(output).toMatch(/value/);
  });

  test('reports no config found when none exists', async () => {
    const { program } = makeProgramWithStore();
    await run(program, 'add-environment', 'dev');
    await run(program, 'add-service', 'user-service', 'dev');

    const { output } = await run(program, 'get-config', 'user-service', 'dev');
    expect(output).toMatch(/no configuration found/i);
  });
});
