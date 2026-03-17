'use strict';

const { validateName } = require('../validation/validator');

/**
 * @param {import('../store/Store')} store
 */
function registerServiceCommands(program, store) {
  program
    .command('add-service <service> <environment>')
    .description('Onboard a service into a specific environment')
    .action(async (service, environment) => {
      const errors = [
        ...validateName(service, 'Service name'),
        ...validateName(environment, 'Environment name'),
      ];
      if (errors.length) {
        console.error(`Error:\n${errors.join('\n')}`);
        process.exitCode = 1;
        return;
      }

      try {
        await store.addService(service, environment);
        console.log(`Service "${service}" registered in environment "${environment}".`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      }
    });

  program
    .command('list-services')
    .description('List all onboarded services')
    .action(async () => {
      const services = await store.listServices();
      if (services.length === 0) {
        console.log('No services registered yet.');
        return;
      }
      console.log('Services:');
      services.forEach(({ name, environments }) => {
        console.log(`  ${name}`);
        environments.forEach((e) => console.log(`    └─ ${e}`));
      });
    });
}

module.exports = { registerServiceCommands };
