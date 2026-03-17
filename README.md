# Configuration Service

A CLI tool for managing service configurations across multiple environments. Store, retrieve, and update key-value config data per service and environment using a local JSON file store.

## Installation

```bash
npm install
```

## Usage

Run commands via:

```bash
node src/cli.js <command> [args]
```

### Environments

```bash
# Add a new environment
node src/cli.js add-environment <name>

# List all environments
node src/cli.js list-environments
```

### Services

```bash
# Register a service in an environment
node src/cli.js add-service <service> <environment>

# List all services and their environments
node src/cli.js list-services
```

### Configs

```bash
# Set a single config key
node src/cli.js set-config <service> <environment> <key> <value>

# Atomically update multiple config keys from a JSON string
node src/cli.js update-config <service> <environment> '{"key1":"val1","key2":"val2"}'

# Get all config for a service in an environment
node src/cli.js get-config <service> <environment>
```

## Example

```bash
node src/cli.js add-environment production
node src/cli.js add-service auth-service production
node src/cli.js set-config auth-service production DB_HOST localhost
node src/cli.js update-config auth-service production '{"DB_PORT":5432,"DEBUG":false}'
node src/cli.js get-config auth-service production
```

## Data Storage

Config is persisted to `data/store.json` at the project root. This file is created automatically on first write.

Config values must be flat (strings, numbers, or booleans — no nested objects).

## Testing

```bash
npm test
```

Tests are written with Jest and include coverage reporting.

## Project Structure

```
src/
  cli.js               # CLI entry point (Commander)
  store/
    FileStore.js       # JSON file-based persistence layer
  validation/
    validator.js       # Input validation helpers
tests/
  FileStore.test.js
  validator.test.js
data/
  store.json           # Auto-generated config store (gitignored)
```
