'use strict';

const {
  parseCliValue,
  validateConfigData,
  validateSingleEntry,
  validateName,
} = require('../validation/validator');

/**
 * @param {import('../store/Store')} store
 */
function registerConfigCommands(program, store) {
  // ── set-config ────────────────────────────────────────────────────────────
  program
    .command('set-config <service> <environment> <key> <value>')
    .description('Set or update a single configuration key for a service in an environment')
    .action(async (service, environment, key, rawValue) => {
      const nameErrors = [
        ...validateName(service, 'Service name'),
        ...validateName(environment, 'Environment name'),
      ];
      if (nameErrors.length) {
        console.error(`Error:\n${nameErrors.join('\n')}`);
        process.exitCode = 1;
        return;
      }

      const value = parseCliValue(rawValue);
      const errors = validateSingleEntry(key, value);
      if (errors.length) {
        console.error(`Validation error:\n${errors.join('\n')}`);
        process.exitCode = 1;
        return;
      }

      try {
        await store.setConfig(service, environment, key, value);
        console.log(`Config updated: ${service}/${environment} → ${key} = ${JSON.stringify(value)}`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      }
    });

  // ── update-config ─────────────────────────────────────────────────────────
  program
    .command('update-config <service> <environment> <json>')
    .description(
      'Atomically merge a JSON object of key-value pairs into the service config.\n' +
      "Example: config update-config payment-service production '{\"timeout_seconds\":30}'"
    )
    .action(async (service, environment, jsonString) => {
      const nameErrors = [
        ...validateName(service, 'Service name'),
        ...validateName(environment, 'Environment name'),
      ];
      if (nameErrors.length) {
        console.error(`Error:\n${nameErrors.join('\n')}`);
        process.exitCode = 1;
        return;
      }

      let data;
      try {
        data = JSON.parse(jsonString);
      } catch {
        console.error('Error: Invalid JSON provided. Ensure the argument is a valid JSON object.');
        process.exitCode = 1;
        return;
      }

      // Validate before touching the store – all-or-nothing guarantee
      const errors = validateConfigData(data);
      if (errors.length) {
        console.error(`Validation errors (no changes applied):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
        process.exitCode = 1;
        return;
      }

      try {
        await store.updateConfig(service, environment, data);
        const keys = Object.keys(data);
        console.log(
          `Config atomically updated for ${service}/${environment}. ` +
          `Keys affected: ${keys.join(', ')}`
        );
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      }
    });

  // ── get-config ────────────────────────────────────────────────────────────
  program
    .command('get-config <service> <environment>')
    .description('Retrieve the current configuration for a service in an environment')
    .action(async (service, environment) => {
      try {
        const entry = await store.getConfig(service, environment);
        if (!entry) {
          console.log(`No configuration found for "${service}" in "${environment}".`);
          return;
        }
        console.log(`\nConfiguration for ${entry.service} / ${entry.environment}`);
        console.log(`Created : ${entry.createdAt}`);
        console.log(`Updated : ${entry.updatedAt}`);
        console.log('Data    :');
        Object.entries(entry.data).forEach(([k, v]) => {
          console.log(`  ${k}: ${JSON.stringify(v)}`);
        });
        console.log('');
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      }
    });
}

module.exports = { registerConfigCommands };
