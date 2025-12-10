# auto-envparse

Automatic environment variable parsing with zero configuration and type inference.

[![NPM Version][npm-image]][npm-url]
[![Test](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml/badge.svg)](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why auto-envparse?

Most environment variable libraries require you to define schemas, validators, or manual mapping code. **auto-envparse** takes a different approach: your object structure **IS** your schema.

Following [12-Factor App](https://12factor.net/config) principles, auto-envparse makes configuration through environment variables effortless and type-safe, allowing you to store config in the environment without complex setup.

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false,
    poolSize: 10
};

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true, DB_POOL_SIZE=20
parseEnv(config, 'DB');

console.log(config);
// {
//   host: 'example.com',
//   port: 3306,        // Automatically converted to number
//   ssl: true,         // Automatically converted to boolean
//   poolSize: 20       // Automatically converted to number
// }
```

**Works with classes too:**

```typescript
import { createFrom } from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;
    poolSize = 10;
}

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
const config = createFrom(DatabaseConfig, 'DB');
// Returns a DatabaseConfig instance with values from environment
```

**No schemas. No validators. No manual mapping. Just works.**

## Features

- ✨ **Zero Configuration** - Object structure defines the schema
- 🎯 **Type Inference** - Automatic type detection from default values
- 🔄 **Type Coercion** - String env vars → correct types (string, number, boolean)
- 🐫 **Naming Convention** - Auto camelCase → SNAKE_CASE conversion
- 🏗️ **Nested Objects** - Full support with dot-notation (e.g., `DB_POOL_MIN`)
- 🛠️ **Custom Overrides** - Add validation or custom parsing when needed
- 📦 **Dual Package** - ESM and CommonJS support
- 🎨 **TypeScript** - Full type safety included
- 🪶 **Lightweight** - Zero dependencies

## Installation

```bash
npm install auto-envparse
```

## Quick Start

### Basic Usage

```typescript
import parseEnv from 'auto-envparse';

const config = {
    apiUrl: 'http://localhost:3000',
    timeout: 5000,
    debug: false
};

// With prefix - Environment variables: APP_API_URL, APP_TIMEOUT, APP_DEBUG
parseEnv(config, 'APP');
```

You can also use the `parse` alias:

```typescript
import { parse } from 'auto-envparse';

parse(config, 'APP');
```

### Without Prefix

The prefix parameter is optional. Omit it to use environment variables without a prefix:

```typescript
const config = {
    host: 'localhost',
    port: 3000,
    nodeEnv: 'development'
};

// Environment variables: HOST, PORT, NODE_ENV
parseEnv(config);
```

This is useful for:
- Simple configurations without namespace conflicts
- Global environment variables like `NODE_ENV`, `PORT`, `HOST`
- Single-service applications where prefixes add unnecessary verbosity

### Nested Objects

```typescript
const config = {
    database: {
        host: 'localhost',
        port: 5432,
        ssl: false
    },
    redis: {
        host: 'localhost',
        port: 6379
    }
};

// Environment:
// APP_DATABASE_HOST=prod-db.example.com
// APP_DATABASE_PORT=5433
// APP_DATABASE_SSL=true
// APP_REDIS_HOST=prod-redis.example.com
parseEnv(config, 'APP');
```

### Class-Based Configuration

If you have existing classes with default values, use `createFrom()` to create and populate instances in one step:

```typescript
import { createFrom } from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;
    poolSize = 10;
}

// Environment: DB_HOST=prod.com, DB_PORT=5433, DB_SSL=true
const config = createFrom(DatabaseConfig, 'DB');
// Returns instance of DatabaseConfig with values from environment
```

This is perfect for:
- **Existing codebases** - Classes already defined with defaults
- **MSR-style projects** - Projects using class-based configuration
- **Less boilerplate** - No need to manually instantiate before parsing
- **Type safety** - Returns properly typed class instance

```typescript
// Works with methods too
class ServerConfig {
    host = '0.0.0.0';
    port = 3000;

    getUrl(): string {
        return `http://${this.host}:${this.port}`;
    }
}

const config = createFrom(ServerConfig, 'SERVER');
console.log(config.getUrl()); // Uses env values
```

## Type Coercion

auto-envparse automatically converts string environment variables to the correct type based on your default values:

| Default Value | Env Var Value | Result | Type |
|---------------|---------------|--------|------|
| `'localhost'` | `'example.com'` | `'example.com'` | `string` |
| `5432` | `'3306'` | `3306` | `number` |
| `false` | `'true'` | `true` | `boolean` |
| `null` | `'value'` | `'value'` | `string` |
| `['a', 'b']` | `'["x","y"]'` | `['x', 'y']` | `array` |

### Boolean Parsing

Boolean values accept multiple formats (case-insensitive):

- **Truthy**: `'true'`, `'1'`, `'yes'`, `'on'`
- **Falsy**: Everything else (`'false'`, `'0'`, `'no'`, `'off'`, etc.)

## Custom Validation

Add custom validation when needed:

```typescript
import parseEnv from 'auto-envparse';

const config = {
    port: 3000,
    environment: 'development'
};

const overrides = new Map();

overrides.set('port', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const port = parseInt(value, 10);
        if (port >= 1 && port <= 65535) {
            obj.port = port;
        } else {
            throw new Error(`Invalid port: ${port}`);
        }
    }
});

parseEnv(config, 'APP', overrides);
```

## Real-World Example

```typescript
import parseEnv from 'auto-envparse';

const config = {
    port: 3000,
    host: '0.0.0.0',
    nodeEnv: 'development',
    database: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '',
        ssl: false,
        pool: {
            min: 2,
            max: 10
        }
    },
    redis: {
        host: 'localhost',
        port: 6379
    }
};

parseEnv(config, 'APP');

// Supported env vars:
// APP_PORT, APP_HOST, APP_NODE_ENV
// APP_DATABASE_HOST, APP_DATABASE_PORT, APP_DATABASE_USER, etc.
// APP_DATABASE_POOL_MIN, APP_DATABASE_POOL_MAX
// APP_REDIS_HOST, APP_REDIS_PORT
```

## Comparison with Other Libraries

| Feature | auto-envparse | envalid | convict | dotenv |
|---------|----------|---------|---------|--------|
| Zero config | ✅ | ❌ | ❌ | ✅ |
| Type inference | ✅ | ❌ | ❌ | ❌ |
| Automatic coercion | ✅ | ✅ | ✅ | ❌ |
| Nested objects | ✅ | ❌ | ✅ | ❌ |
| Custom validation | ✅ | ✅ | ✅ | ❌ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| Dependencies | 0 | 1 | 2 | 0 |

**auto-envparse** is the only library that uses reflection and type inference to eliminate schema definitions entirely.

## TypeScript Support

auto-envparse is written in TypeScript and provides full type safety:

```typescript
interface Config {
    host: string;
    port: number;
    ssl: boolean;
}

const config: Config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

parseEnv(config, 'DB');

// config.host is typed as string
// config.port is typed as number
// config.ssl is typed as boolean
```

## API Reference

For detailed API documentation, see [API.md](./API.md).

### Main Functions

- **`parseEnv(target, prefix?, overrides?)`** - Parse environment variables into object
- **`parse(target, prefix?, overrides?)`** - Alias for parseEnv
- **`createFrom(classConstructor, prefix?, overrides?)`** - Create and populate class instance
- **`AutoEnv` class** - Access to all utility functions

See the [complete API documentation](./API.md) for detailed signatures, examples, and advanced usage.

## How It Works

auto-envparse uses JavaScript reflection to:

1. **Discover properties** - Iterate through your object's own properties
2. **Infer types** - Determine types from default values
3. **Generate env var names** - Convert camelCase to PREFIX_SNAKE_CASE
4. **Parse and coerce** - Read env vars and convert to correct types
5. **Apply values** - Update object properties in-place

No magic. No complex schemas. Just smart reflection.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Volodymyr Lavrynovych](https://github.com/vlavrynovych)

## Links

- [GitHub Repository](https://github.com/vlavrynovych/auto-envparse)
- [npm Package](https://www.npmjs.com/package/auto-envparse)
- [Issue Tracker](https://github.com/vlavrynovych/auto-envparse/issues)
- [API Documentation](./API.md)

[npm-image]: https://img.shields.io/npm/v/auto-envparse.svg?style=flat
[npm-url]: https://npmjs.org/package/auto-envparse
