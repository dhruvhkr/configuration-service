'use strict';

const ALLOWED_TYPES = new Set(['string', 'number', 'boolean']);

/**
 * Parses a CLI string argument into its most appropriate primitive type.
 *   "true" / "false"  → boolean
 *   numeric strings   → number
 *   everything else   → string
 */
function parseCliValue(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== '') return num;
  return raw;
}

/**
 * Validates that every value in a flat config object is a primitive type.
 * Returns an array of error strings (empty means valid).
 * @param {object} data
 * @returns {string[]}
 */
function validateConfigData(data) {
  const errors = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('Configuration data must be a flat JSON object');
    return errors;
  }

  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string' || key.trim() === '') {
      errors.push(`Key must be a non-empty string (got: ${JSON.stringify(key)})`);
      continue;
    }
    if (!ALLOWED_TYPES.has(typeof value)) {
      errors.push(
        `Key "${key}" has invalid type "${typeof value}". ` +
        `Allowed types: string, number, boolean`
      );
    }
    if (value !== null && typeof value === 'object') {
      errors.push(`Key "${key}" must be a primitive value, not an object or array`);
    }
  }

  return errors;
}

/**
 * Validates a single key-value pair.
 * @param {string} key
 * @param {*} value
 * @returns {string[]}
 */
function validateSingleEntry(key, value) {
  const errors = [];
  if (typeof key !== 'string' || key.trim() === '') {
    errors.push('Key must be a non-empty string');
  }
  if (!ALLOWED_TYPES.has(typeof value)) {
    errors.push(`Value for "${key}" has unsupported type "${typeof value}". Allowed: string, number, boolean`);
  }
  return errors;
}

/**
 * Validates an environment name – alphanumeric, hyphens, underscores only.
 */
function validateName(name, label = 'Name') {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return [`${label} "${name}" is invalid. Use only letters, digits, hyphens, or underscores`];
  }
  return [];
}

module.exports = { parseCliValue, validateConfigData, validateSingleEntry, validateName };
