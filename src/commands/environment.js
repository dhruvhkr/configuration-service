'use strict';

const { validateName } = require('../validation/validator');

/**
 * @param {import('../store/Store')} store
 */
function registerEnvironmentCommands(program, store) {
  program
    .command('add-environment <name>')
    .description('Register a new environment (e.g. dev, staging, production)')
    .action(async (name) => {
      const errors = validateName(name, 'Environment name');
      if (errors.length) {
        console.error(`Error: ${errors.join('\n')}`);
        process.exitCode = 1;
        return;
      }

      try {
        await store.addEnvironment(name);
        console.log(`Environment "${name}" added successfully.`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      }
    });

  program
    .command('list-environments')
    .description('List all registered environments')
    .action(async () => {
      const envs = await store.listEnvironments();
      if (envs.length === 0) {
        console.log('No environments registered yet.');
        return;
      }
      console.log('Environments:');
      envs.forEach((e) => console.log(`  - ${e}`));
    });
}

module.exports = { registerEnvironmentCommands };
