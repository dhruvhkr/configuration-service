#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const FileStore = require('./store/FileStore');
const { registerEnvironmentCommands } = require('./commands/environment');
const { registerServiceCommands } = require('./commands/service');
const { registerConfigCommands } = require('./commands/config');

const program = new Command();
const store = new FileStore();

program
  .name('config')
  .description('Configuration management service for platform teams')
  .version('1.0.0');

registerEnvironmentCommands(program, store);
registerServiceCommands(program, store);
registerConfigCommands(program, store);

program.parseAsync(process.argv).catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
