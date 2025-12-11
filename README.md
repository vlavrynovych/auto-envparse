# auto-envparse

> ⚡ Automatic environment variable parsing with zero configuration and type inference

[![NPM Version][npm-image]][npm-url]
[![Test](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml/badge.svg)](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Following [12-Factor App](https://12factor.net/config) principles** - Store configuration in the environment without schemas, validators, or manual type conversion. Your object structure **IS** your schema.

---

## 💡 Why auto-envparse?

Most environment variable libraries force you to write schemas and validators before you can parse anything:

```typescript
// ❌ Other libraries: Define schema + types + validators
const schema = {
  host: str({ default: 'localhost' }),
  port: num({ default: 5432 }),
  ssl: bool({ default: false })
};
const config = cleanEnv(process.env, schema);
```

**auto-envparse takes a different approach.** If you already have a configuration object with defaults, that's all you need:

```typescript
// ✅ auto-envparse: Your object IS the schema
import { AutoEnvParse } from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

AutoEnvParse.parse(config, 'DB'); // Done!
```

**The type of each default value tells auto-envparse how to parse it.** No schemas. No validators. No manual type conversion. Just works.

### Works with Classes Too

```typescript
import { AutoEnvParse } from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;
}

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
const config = AutoEnvParse.parse(DatabaseConfig, 'DB');
// Returns a fully populated DatabaseConfig instance
```

Perfect for existing codebases with class-based configuration.

---

## 🎯 Features

- ✨ **Zero Configuration** - Object structure defines the schema
- 🎯 **Type Inference** - Automatic type detection from default values
- 🔄 **Type Coercion** - String env vars → correct types (string, number, boolean, array)
- 🐫 **Smart Naming** - Auto camelCase → SNAKE_CASE conversion
- 🏗️ **Nested Objects** - Full support with dot-notation (e.g., `DB_POOL_MIN`)
- 🛠️ **Custom Overrides** - Add validation or custom parsing when needed
- 📦 **Dual Package** - ESM and CommonJS support
- 🎨 **TypeScript** - Full type safety included
- 🪶 **Lightweight** - Zero dependencies

---

## 📦 Installation

```bash
npm install auto-envparse
```

```bash
yarn add auto-envparse
```

---

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    apiUrl: 'http://localhost:3000',
    timeout: 5000,
    debug: false
};

// Environment variables: APP_API_URL, APP_TIMEOUT, APP_DEBUG
AutoEnvParse.parse(config, 'APP');

console.log(config.timeout); // Automatically converted to number
```

**Shorter alias:** Import as default for shorter code:

```typescript
import AEP from 'auto-envparse';
AEP.parse(config, 'APP');
```

### 2. Without Prefix

Prefix is optional - omit it for global environment variables:

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 3000,
    nodeEnv: 'development'
};

// Environment variables: HOST, PORT, NODE_ENV
AutoEnvParse.parse(config);
```

### 3. Nested Objects

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    database: {
        host: 'localhost',
        port: 5432,
        pool: {
            min: 2,
            max: 10
        }
    }
};

// Environment:
// APP_DATABASE_HOST=prod.com
// APP_DATABASE_PORT=5433
// APP_DATABASE_POOL_MIN=5
// APP_DATABASE_POOL_MAX=20
AutoEnvParse.parse(config, 'APP');
```

### 4. Class-Based Configuration

```typescript
import { AutoEnvParse } from 'auto-envparse';

class ServerConfig {
    host = '0.0.0.0';
    port = 3000;

    getUrl(): string {
        return `http://${this.host}:${this.port}`;
    }
}

// Environment: SERVER_HOST=example.com, SERVER_PORT=8080
const config = AutoEnvParse.parse(ServerConfig, 'SERVER');
console.log(config.getUrl()); // 'http://example.com:8080'
```

---

## 📖 Type Coercion

auto-envparse automatically converts environment variables based on your default value types:

| Default Value | Env Var | Result | Type |
|---------------|---------|--------|------|
| `'localhost'` | `'prod.com'` | `'prod.com'` | `string` |
| `5432` | `'3306'` | `3306` | `number` |
| `false` | `'true'` | `true` | `boolean` |
| `['a']` | `'["x","y"]'` | `['x', 'y']` | `array` |

### Boolean Parsing

Flexible boolean parsing (case-insensitive):

- **Truthy**: `'true'`, `'1'`, `'yes'`, `'on'`
- **Falsy**: Everything else

---

## 🛠️ Custom Validation

Add validation when needed using overrides:

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = { port: 3000 };
const overrides = new Map();

overrides.set('port', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const port = parseInt(value, 10);
        if (port >= 1 && port <= 65535) {
            obj.port = port;
        } else {
            throw new Error(`Port must be 1-65535, got: ${port}`);
        }
    }
});

AutoEnvParse.parse(config, 'APP', overrides);
```

### Enum Validation

For enum-like values, use the built-in `enumValidator` helper:

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    env: 'dev',
    log: 'info',
    region: 'us-east-1',
    protocol: 'https'
};

// Compact initialization for multiple enum fields
const overrides = new Map([
    ['env', AutoEnvParse.enumValidator('env', ['dev', 'staging', 'prod'])],
    ['log', AutoEnvParse.enumValidator('log', ['debug', 'info', 'warn', 'error'])],
    ['region', AutoEnvParse.enumValidator('region', ['us-east-1', 'us-west-2', 'eu-west-1'])],
    ['protocol', AutoEnvParse.enumValidator('protocol', ['http', 'https'])],
]);

AutoEnvParse.parse(config, 'APP', overrides);

// ✅ Valid: APP_ENV=prod, APP_LOG=info, APP_REGION=us-west-2, APP_PROTOCOL=https
// ❌ Invalid: APP_ENV=test (throws error - not in allowed list)
// ❌ Invalid: APP_REGION=ap-south-1 (throws error - not in allowed list)
```

---

## 📚 Documentation

### Getting Started
- [Quick Start](#-quick-start) - Get up and running in 30 seconds
- [Type Coercion](#-type-coercion) - How types are automatically converted
- [Installation](#-installation) - npm and yarn instructions

### Configuration
- [Custom Validation](#-custom-validation) - Add validation rules
- [Nested Objects](#3-nested-objects) - Working with deep structures
- [Class-Based Config](#4-class-based-configuration) - Using with classes

### Reference
- [API Documentation](./API.md) - Complete API reference
- [CHANGELOG](./CHANGELOG.md) - Version history

---

## 📊 Comparison with Other Libraries

| Feature | auto-envparse | envalid | convict | dotenv |
|---------|--------------|---------|---------|--------|
| Zero config | ✅ | ❌ | ❌ | ✅ |
| Type inference | ✅ | ❌ | ❌ | ❌ |
| Auto coercion | ✅ | ✅ | ✅ | ❌ |
| Nested objects | ✅ | ❌ | ✅ | ❌ |
| Custom validation | ✅ | ✅ | ✅ | ❌ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| Dependencies | 0 | 1 | 2 | 0 |

**auto-envparse** is the only library that uses reflection and type inference to eliminate schema definitions entirely.

---

## 🎨 TypeScript Support

Full type safety with TypeScript:

```typescript
import { AutoEnvParse } from 'auto-envparse';

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

AutoEnvParse.parse(config, 'DB');

// All types are preserved and enforced
const host: string = config.host;
const port: number = config.port;
const ssl: boolean = config.ssl;
```

### Dual Package Support

auto-envparse supports both CommonJS and ESM:

```typescript
// ESM (import) - Named export
import { AutoEnvParse } from 'auto-envparse';
AutoEnvParse.parse(config, 'DB');

// ESM (import) - Default export
import AEP from 'auto-envparse';
AEP.parse(config, 'DB');

// CommonJS (require) - Named export
const { AutoEnvParse } = require('auto-envparse');
AutoEnvParse.parse(config, 'DB');

// CommonJS (require) - Default export
const AEP = require('auto-envparse').default;
AEP.parse(config, 'DB');
```

Works seamlessly in both module systems!

---

## 🔧 How It Works

auto-envparse uses JavaScript reflection to eliminate configuration:

1. **Discover** - Iterate through object's own properties
2. **Infer** - Determine types from default values
3. **Transform** - Convert camelCase to PREFIX_SNAKE_CASE
4. **Parse** - Read env vars and coerce to correct types
5. **Apply** - Update properties in-place

No magic. No complex schemas. Just smart reflection.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

See [GitHub Issues](https://github.com/vlavrynovych/auto-envparse/issues) for open tasks and discussions.

---

## 📄 License

MIT © [Volodymyr Lavrynovych](https://github.com/vlavrynovych)

---

## 🔗 Links

- 📦 [npm Package](https://www.npmjs.com/package/auto-envparse)
- 🐙 [GitHub Repository](https://github.com/vlavrynovych/auto-envparse)
- 📖 [API Documentation](./API.md)
- 🐛 [Issue Tracker](https://github.com/vlavrynovych/auto-envparse/issues)

[npm-image]: https://img.shields.io/npm/v/auto-envparse.svg?style=flat
[npm-url]: https://npmjs.org/package/auto-envparse
