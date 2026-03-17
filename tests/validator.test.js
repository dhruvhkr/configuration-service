const { validateConfigData, validateEnvironmentName, validateServiceName } = require('../src/validation/validator');

describe('validateConfigData', () => {
  test('accepts valid flat object with string, number, boolean', () => {
    expect(() =>
      validateConfigData({ url: 'https://example.com', timeout: 30, enabled: true })
    ).not.toThrow();
  });

  test('throws if value is a nested object', () => {
    expect(() =>
      validateConfigData({ db: { host: 'localhost' } })
    ).toThrow('"db" must be a string, number, or boolean');
  });

  test('throws if value is null', () => {
    expect(() =>
      validateConfigData({ key: null })
    ).toThrow('"key" must be a string, number, or boolean');
  });

  test('throws if value is an array', () => {
    expect(() =>
      validateConfigData({ tags: ['a', 'b'] })
    ).toThrow('"tags" must be a string, number, or boolean');
  });

  test('throws if input is not an object', () => {
    expect(() => validateConfigData('string')).toThrow('Config must be a flat JSON object');
    expect(() => validateConfigData(null)).toThrow('Config must be a flat JSON object');
    expect(() => validateConfigData([1, 2])).toThrow('Config must be a flat JSON object');
  });
});

describe('validateEnvironmentName', () => {
  test('accepts a valid environment name', () => {
    expect(() => validateEnvironmentName('staging')).not.toThrow();
  });

  test('throws if name is empty string', () => {
    expect(() => validateEnvironmentName('')).toThrow('Environment name cannot be empty');
  });

  test('throws if name is only whitespace', () => {
    expect(() => validateEnvironmentName('   ')).toThrow('Environment name cannot be empty');
  });
});

describe('validateServiceName', () => {
  test('accepts a valid service name', () => {
    expect(() => validateServiceName('payment-service')).not.toThrow();
  });

  test('throws if name is empty string', () => {
    expect(() => validateServiceName('')).toThrow('Service name cannot be empty');
  });

  test('throws if name is only whitespace', () => {
    expect(() => validateServiceName('   ')).toThrow('Service name cannot be empty');
  });
});
