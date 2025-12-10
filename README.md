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
// or
parse(config);
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
// DB_DATABASE_HOST=prod-db.example.com
// DB_DATABASE_PORT=5433
// DB_DATABASE_SSL=true
// DB_REDIS_HOST=prod-redis.example.com
// DB_REDIS_PORT=6380
parseEnv(config, 'DB');
```

### Custom Validation with Overrides

```typescript
import parseEnv from 'auto-envparse';

const config = {
    port: 3000,
    environment: 'development'
};

const overrides = new Map();

// Custom validation for port
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

// Custom validation for environment
overrides.set('environment', (obj, envVar) => {
    const value = process.env[envVar];
    if (value && ['development', 'staging', 'production'].includes(value)) {
        obj.environment = value;
    } else {
        throw new Error(`Invalid environment: ${value}`);
    }
});

parseEnv(config, 'APP', overrides);
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

## Naming Convention

auto-envparse automatically converts camelCase property names to SNAKE_CASE environment variables:

```typescript
const config = {
    apiKey: '',           // → APP_API_KEY
    maxRetries: 3,        // → APP_MAX_RETRIES
    connectionTimeout: 30 // → APP_CONNECTION_TIMEOUT
};

parseEnv(config, 'APP');
```

## Advanced Usage

### Using Individual Utility Functions

```typescript
import { AutoEnv } from 'auto-envparse';

// Parse booleans
AutoEnv.parseBoolean('true');  // true
AutoEnv.parseBoolean('1');     // true
AutoEnv.parseBoolean('yes');   // true

// Parse numbers
AutoEnv.parseNumber('42');     // 42
AutoEnv.parseNumber('3.14');   // 3.14

// Convert names
AutoEnv.toSnakeCase('poolSize');  // 'pool_size'

// Type coercion
AutoEnv.coerceValue('42', 'number');    // 42
AutoEnv.coerceValue('true', 'boolean'); // true
AutoEnv.coerceValue('hello', 'string'); // 'hello'
```

### Loading Nested Objects Separately

```typescript
import { AutoEnv } from 'auto-envparse';

// Environment: APP_LOGGING_ENABLED=true, APP_LOGGING_MAX_FILES=20
const loggingConfig = AutoEnv.loadNestedFromEnv('APP_LOGGING', {
    enabled: false,
    path: './logs',
    maxFiles: 10
});

console.log(loggingConfig);
// {
//   enabled: true,
//   path: './logs',
//   maxFiles: 20
// }
```

### Using the AutoEnv Class Directly

```typescript
import { AutoEnv } from 'auto-envparse';

const config = { host: 'localhost', port: 5432 };
AutoEnv.parse(config, 'DB');
```

## Real-World Examples

### Database Configuration

```typescript
import parseEnv from 'auto-envparse';

const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: '',
    ssl: false,
    pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000
    }
};

autoEnv(dbConfig, 'DATABASE');

// Supported env vars:
// DATABASE_HOST
// DATABASE_PORT
// DATABASE_DATABASE
// DATABASE_USER
// DATABASE_PASSWORD
// DATABASE_SSL
// DATABASE_POOL_MIN
// DATABASE_POOL_MAX
// DATABASE_POOL_IDLE_TIMEOUT_MILLIS
```

### Application Configuration

```typescript
import parseEnv from 'auto-envparse';

const appConfig = {
    port: 3000,
    host: '0.0.0.0',
    nodeEnv: 'development',
    cors: {
        enabled: true,
        origin: '*',
        credentials: false
    },
    rateLimit: {
        windowMs: 900000,
        max: 100
    },
    logging: {
        level: 'info',
        format: 'json'
    }
};

autoEnv(appConfig, 'APP');
```

### Microservices Configuration

```typescript
import parseEnv from 'auto-envparse';

const services = {
    auth: {
        url: 'http://localhost:4001',
        timeout: 5000
    },
    payment: {
        url: 'http://localhost:4002',
        timeout: 10000
    },
    notification: {
        url: 'http://localhost:4003',
        timeout: 3000
    }
};

autoEnv(services, 'SERVICES');

// Env vars:
// SERVICES_AUTH_URL=https://auth.example.com
// SERVICES_AUTH_TIMEOUT=5000
// SERVICES_PAYMENT_URL=https://payment.example.com
// ...
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

## How It Works

auto-envparse uses JavaScript reflection to:

1. **Discover properties** - Iterate through your object's own properties
2. **Infer types** - Determine types from default values
3. **Generate env var names** - Convert camelCase to PREFIX_SNAKE_CASE
4. **Parse and coerce** - Read env vars and convert to correct types
5. **Apply values** - Update object properties in-place

No magic. No complex schemas. Just smart reflection.

## Edge Cases and Limitations

- **Inherited properties** are skipped (only own properties are processed)
- **Arrays** expect JSON format in env vars: `'["item1", "item2"]'`
- **Complex objects** (class instances) are supported with dot-notation
- **null/undefined** default values are treated as strings

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
