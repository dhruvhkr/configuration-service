#!/usr/bin/env node

const { Command } = require("commander");
const FileStore = require("./store/FileStore");
const {
  validateConfigData,
  validateEnvironmentName,
  validateServiceName,
} = require("./validation/validator");

const program = new Command();
const store = new FileStore();

program
  .name("config")
  .description("Configuration management service CLI")
  .version("1.0.0");

// ── Environments ──────────────────────────────────────────────────────────────

program
  .command("add-environment <name>")
  .description("Add a new environment")
  .action((name) => {
    try {
      validateEnvironmentName(name);
      store.addEnvironment(name);
      console.log(`Environment "${name}" added successfully.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("list-environments")
  .description("List all environments")
  .action(() => {
    const envs = store.listEnvironments();
    if (envs.length === 0) {
      console.log("No environments found.");
    } else {
      console.log("Environments:");
      envs.forEach((e) => console.log(`  - ${e}`));
    }
  });

// ── Services ──────────────────────────────────────────────────────────────────

program
  .command("add-service <service> <environment>")
  .description("Register a service in an environment")
  .action((service, environment) => {
    try {
      validateServiceName(service);
      store.addService(service, environment);
      console.log(
        `Service "${service}" registered in environment "${environment}".`,
      );
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("list-services")
  .description("List all services")
  .action(() => {
    const services = store.listServices();
    if (services.length === 0) {
      console.log("No services found.");
    } else {
      console.log("Services:");
      services.forEach(({ name, environments }) => {
        console.log(`  - ${name} [${environments.join(", ")}]`);
      });
    }
  });

// ── Configs ───────────────────────────────────────────────────────────────────

program
  .command("set-config <service> <environment> <key> <value>")
  .description("Set a single config key for a service in an environment")
  .action((service, environment, key, value) => {
    try {
      store.setConfig(service, environment, key, value);
      console.log(`Config updated: ${key} = ${value}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("update-config <service> <environment> <json>")
  .description("Atomically update multiple config keys from a JSON string")
  .action((service, environment, json) => {
    try {
      const data = JSON.parse(json);
      validateConfigData(data);
      store.updateConfig(service, environment, data);
      console.log(
        `Config for "${service}" in "${environment}" updated successfully.`,
      );
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("get-config <service> <environment>")
  .description("Get config for a service in an environment")
  .action((service, environment) => {
    try {
      const config = store.getConfig(service, environment);
      if (!config) {
        console.log(`No config found for "${service}" in "${environment}".`);
      } else {
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
