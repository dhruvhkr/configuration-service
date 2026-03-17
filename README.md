# Configuration Service

A CLI tool for managing application configurations across environments, built for platform teams.

## Requirements

- Node.js >= 18
- npm >= 9

## Setup

```bash
npm install
npm link        # optional: makes `config` available globally
```

## Usage

All commands follow the pattern: `node src/cli.js <command> [args]`
After `npm link`, replace `node src/cli.js` with `config`.

### Environments

```bash
# Register a new environment
node src/cli.js add-environment staging
node src/cli.js add-environment production

# List all environments
node src/cli.js list-environments
```

### Services

```bash
# Onboard a service into an environment
node src/cli.js add-service payment-service staging
node src/cli.js add-service payment-service production

# List all services and their environments
node src/cli.js list-services
```

### Configuration

```bash
# Set a single configuration key
node src/cli.js set-config payment-service production timeout_seconds 30
node src/cli.js set-config payment-service production enable_logging true
node src/cli.js set-config payment-service production gateway_url https://api.example.com

# Atomically update multiple keys at once
node src/cli.js update-config payment-service production \
  '{"timeout_seconds": 30, "retry_attempts": 3, "enable_logging": true, "max_connections": 100}'

# Retrieve config for a service in an environment
node src/cli.js get-config payment-service production
```

## Running Tests

```bash
npm test                # run all tests with coverage report
npm run test:watch      # watch mode
```

## Architecture

```
configuration-service/
├── src/
│   ├── cli.js                   # Commander entrypoint – wires program + store + commands
│   ├── store/
│   │   ├── Store.js             # Abstract base class (interface)
│   │   └── FileStore.js        # JSON file-backed implementation
│   ├── commands/
│   │   ├── environment.js       # add-environment, list-environments
│   │   ├── service.js           # add-service, list-services
│   │   └── config.js            # set-config, update-config, get-config
│   └── validation/
│       └── validator.js         # Type checking, name validation, CLI value parsing
└── tests/
    ├── validator.test.js
    ├── FileStore.test.js
    └── commands.test.js
```

### Design Decisions

**Store abstraction** — `Store.js` defines a clean interface. Switching from `FileStore` to a Postgres or Redis-backed store requires implementing the same interface, with no changes to command logic.

**Atomic updates** — `update-config` validates the entire payload before calling the store. If any key fails type validation, the store is never touched — all-or-nothing semantics are enforced at the command layer, not the store layer.

**Type inference for CLI values** — `set-config` takes a raw string argument and infers the type: `"true"/"false"` → boolean, numeric strings → number, everything else → string. This avoids requiring users to specify types explicitly.

**Flat config validation** — only `string`, `number`, and `boolean` primitives are accepted as values. Nested objects and arrays are rejected with clear error messages.

**Persistence** — data is stored in `~/.config-service-data.json`. The file is written synchronously on each mutation so the state is always consistent. A future database adapter would replace the `_save`/`_load` pair in `FileStore`.

## Data Model

```json
{
  "environments": ["dev", "staging", "production"],
  "services": {
    "payment-service": ["staging", "production"]
  },
  "configs": {
    "payment-service:production": {
      "service": "payment-service",
      "environment": "production",
      "data": {
        "payment_gateway_url": "https://config.infraspec.dev/api",
        "timeout_seconds": 60,
        "retry_attempts": 3,
        "enable_logging": true,
        "max_connections": 100
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-02T12:00:00.000Z"
    }
  }
}
```
