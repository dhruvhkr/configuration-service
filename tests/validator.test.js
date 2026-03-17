'use strict';

const {
  parseCliValue,
  validateConfigData,
  validateSingleEntry,
  validateName,
} = require('../src/validation/validator');

describe('parseCliValue', () => {
  test('parses "true" as boolean true', () => {
    expect(parseCliValue('true')).toBe(true);
  });

  test('parses "false" as boolean false', () => {
    expect(parseCliValue('false')).toBe(false);
  });

  test('parses numeric string as number', () => {
    expect(parseCliValue('42')).toBe(42);
    expect(parseCliValue('3.14')).toBe(3.14);
    expect(parseCliValue('0')).toBe(0);
  });

  test('parses plain string as string', () => {
    expect(parseCliValue('hello')).toBe('hello');
    expect(parseCliValue('https://example.com')).toBe('https://example.com');
  });

  test('treats whitespace-only string as string, not number', () => {
    expect(typeof parseCliValue('   ')).toBe('string');
  });
});

describe('validateConfigData', () => {
  test('accepts a valid flat object', () => {
    const data = {
      payment_gateway_url: 'https://api.example.com',
      timeout_seconds: 60,
      retry_attempts: 3,
      enable_logging: true,
      max_connections: 100,
    };
    expect(validateConfigData(data)).toHaveLength(0);
  });

  test('rejects null', () => {
    expect(validateConfigData(null).length).toBeGreaterThan(0);
  });

  test('rejects arrays', () => {
    expect(validateConfigData([]).length).toBeGreaterThan(0);
  });

  test('rejects nested objects', () => {
    const errors = validateConfigData({ nested: { key: 'value' } });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects null values', () => {
    const errors = validateConfigData({ key: null });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects array values', () => {
    const errors = validateConfigData({ key: [1, 2, 3] });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('returns multiple errors for multiple bad keys', () => {
    const errors = validateConfigData({ a: null, b: { x: 1 } });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  test('accepts empty object', () => {
    expect(validateConfigData({})).toHaveLength(0);
  });
});

describe('validateSingleEntry', () => {
  test('accepts valid string value', () => {
    expect(validateSingleEntry('key', 'value')).toHaveLength(0);
  });

  test('accepts valid number value', () => {
    expect(validateSingleEntry('timeout', 30)).toHaveLength(0);
  });

  test('accepts valid boolean value', () => {
    expect(validateSingleEntry('flag', false)).toHaveLength(0);
  });

  test('rejects object value', () => {
    expect(validateSingleEntry('key', {})).toHaveLength(1);
  });

  test('rejects null value', () => {
    expect(validateSingleEntry('key', null)).toHaveLength(1);
  });

  test('rejects empty key', () => {
    expect(validateSingleEntry('', 'val').length).toBeGreaterThan(0);
  });
});

describe('validateName', () => {
  test('accepts alphanumeric names', () => {
    expect(validateName('production')).toHaveLength(0);
    expect(validateName('payment-service')).toHaveLength(0);
    expect(validateName('user_service')).toHaveLength(0);
    expect(validateName('svc123')).toHaveLength(0);
  });

  test('rejects names with spaces', () => {
    expect(validateName('my service').length).toBeGreaterThan(0);
  });

  test('rejects names with special characters', () => {
    expect(validateName('svc@prod').length).toBeGreaterThan(0);
    expect(validateName('svc/prod').length).toBeGreaterThan(0);
  });

  test('uses provided label in error message', () => {
    const [err] = validateName('bad name', 'Service name');
    expect(err).toMatch(/Service name/);
  });
});
