# auto-envparse

> ⚡ Automatic environment variable parsing with zero configuration and type inference

[![NPM Version][npm-image]][npm-url]
[![Test](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml/badge.svg)](https://github.com/vlavrynovych/auto-envparse/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Following [12-Factor App](https://12factor.net/config) principles** - Store configuration in the environment without schemas, validators, or manual type conversion. Your object structure **IS** your schema.

---

## 📋 Table of Contents

- [💡 Why auto-envparse?](#-why-auto-envparse)
- [🎯 Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📖 Type Coercion & Advanced Types](#-type-coercion--advanced-types)
- [📁 .env File Loading](#-env-file-loading)
- [🛠️ Custom Validation & Transforms](#️-custom-validation--transforms)
- [📚 Documentation](#-documentation)
- [🎨 TypeScript Support](#-typescript-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🔗 Links](#-links)

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
import AEP from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

AEP.parse(config, { prefix: 'DB' }); // Done!
```

**The type of each default value tells auto-envparse how to parse it.** No schemas. No validators. No manual type conversion. Just works.

### Works with Classes Too

```typescript
import AEP from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;
}

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
const config = AEP.parse(DatabaseConfig, { prefix: 'DB' });
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
- 📋 **Nested Arrays** - Arrays of objects with dot-notation (e.g., `SERVERS_0_HOST`)
- 📁 **.env File Loading** - Load from .env files with configurable priority
- 🔀 **Multi-Source Support** - Merge variables from multiple sources (env, .env, .env.local)
- 🔀 **Transform Functions** - Custom value transformations with external libraries
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
import AEP from 'auto-envparse';

const config = {
    apiUrl: 'http://localhost:3000',
    timeout: 5000,
    debug: false
};

// Environment variables: APP_API_URL, APP_TIMEOUT, APP_DEBUG
AEP.parse(config, { prefix: 'APP' });

console.log(config.timeout); // Automatically converted to number
```

**Shorter alias:** Import as default for shorter code:

```typescript
import AEP from 'auto-envparse';
AEP.parse(config, { prefix: 'APP' });
```

### 2. Without Prefix

Prefix is optional - omit it for global environment variables:

```typescript
import AEP from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 3000,
    nodeEnv: 'development'
};

// Environment variables: HOST, PORT, NODE_ENV
AEP.parse(config);
```

### 3. Nested Objects

```typescript
import AEP from 'auto-envparse';

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
AEP.parse(config, { prefix: 'APP' });
```

### 4. Class-Based Configuration

```typescript
import AEP from 'auto-envparse';

class ServerConfig {
    host = '0.0.0.0';
    port = 3000;

    getUrl(): string {
        return `http://${this.host}:${this.port}`;
    }
}

// Environment: SERVER_HOST=example.com, SERVER_PORT=8080
const config = AEP.parse(ServerConfig, { prefix: 'SERVER' });
console.log(config.getUrl()); // 'http://example.com:8080'
```

---

## 📖 Type Coercion & Advanced Types

auto-envparse automatically converts environment variables based on your default value types:

| Type | Example | Result |
|------|---------|--------|
| `string` | `DB_HOST=prod.com` | `'prod.com'` |
| `number` | `DB_PORT=3306` | `3306` |
| `boolean` | `DB_SSL=true` | `true` (supports: true/false, 1/0, yes/no, on/off) |
| `object` | `DB_POOL_MIN=5` | Nested via dot-notation or JSON |
| `array` | `SERVERS_0_HOST=x.com` | Arrays via dot-notation or JSON |

**Arrays of Objects:**
```typescript
const config = { servers: [{ host: 'localhost', port: 8080 }] };
// SERVERS_0_HOST=s1.com, SERVERS_0_PORT=8080, SERVERS_1_HOST=s2.com, SERVERS_1_PORT=8081
AEP.parse(config, { prefix: 'APP' });
```

See [API.md](API.md) for complete type coercion details and edge cases.

---------------|---------|--------|------|
| `'localhost'` | `'prod.com'` | `'prod.com'` | `string` |
| `5432` | `'3306'` | `3306` | `number` |
| `false` | `'true'` | `true` | `boolean` |
| `['a']` | `'["x","y"]'` | `['x', 'y']` | `array` |

### Boolean Parsing

Flexible boolean parsing (case-insensitive):

- **Truthy**: `'true'`, `'1'`, `'yes'`, `'on'`
- **Falsy**: Everything else

### Nested Arrays

Arrays of objects support both JSON and dot-notation formats. Dot-notation takes priority:

**Dot-Notation Format** (Recommended):
```typescript
const config = {
    servers: [{
        host: 'localhost',
        port: 3000
    }]
};

// Environment variables:
// APP_SERVERS_0_HOST=server1.com
// APP_SERVERS_0_PORT=8080
// APP_SERVERS_1_HOST=server2.com
// APP_SERVERS_1_PORT=8081

AEP.parse(config, { prefix: 'APP' });
// Result: servers = [
//   { host: 'server1.com', port: 8080 },
//   { host: 'server2.com', port: 8081 }
// ]
```

**JSON Format** (Also supported):
```typescript
// APP_SERVERS='[{"host":"server1.com","port":8080}]'
AEP.parse(config, { prefix: 'APP' });
```

**Features**:
- ✅ Multilevel nesting: `APP_SERVICES_0_CONFIG_DATABASE_HOST=db.com`
- ✅ Sparse arrays: Indices `0, 2, 5` → compact array with 3 elements
- ✅ Type coercion: String env vars → proper types in array elements
- ✅ Empty arrays skipped (require template element)

---

## 📁 .env File Loading

Load from `.env` files with configurable priority:

```typescript
import AEP from 'auto-envparse';

const config = { host: 'localhost', port: 3000 };

// Default: loads from ['env', '.env']
AEP.parse(config, { prefix: 'APP' });

// Multi-source with priority (first wins):
AEP.parse(config, {
    prefix: 'APP',
    sources: ['env', '.env.local', '.env']  // process.env > .env.local > .env
});

// Custom parser (e.g., dotenv):
import { parse } from 'dotenv';
AEP.parse(config, {
    prefix: 'APP',
    sources: ['.env'],
    envFileParser: parse
});
```

The built-in parser supports `KEY=value`, comments, and quotes. For advanced features (multiline, variable expansion), use `dotenv.parse`. See [API.md](API.md) for details.

---


## 🛠️ Custom Validation & Transforms

Add custom validation using overrides:

```typescript
import AEP from 'auto-envparse';

const config = { port: 3000, env: 'dev' as 'dev' | 'staging' | 'prod' };

const overrides = new Map([
    // Custom validation
    ['port', (obj, envVar) => {
        const port = parseInt(process.env[envVar] || '');
        if (port >= 1 && port <= 65535) obj.port = port;
        else throw new Error(`Invalid port: ${port}`);
    }],

    // Enum validation (built-in helper)
    ['env', AEP.enumValidator('env', ['dev', 'staging', 'prod'])],

    // Transform values (built-in helper)
    ['timeout', AEP.transform('timeout', (val) => Math.max(parseInt(val), 1000))]
]);

AEP.parse(config, { prefix: 'APP', overrides });
```

**Helpers available:**
- `AEP.enumValidator(key, allowedValues)` - Validate enum values
- `AEP.transform(key, fn)` - Transform values with custom logic

See [API.md](API.md) for complete override examples and helper documentation.

---

## 📚 Documentation

- **[API.md](./API.md)** - Complete API reference with all methods and options
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and migration guides

---

---

---

## 🎨 TypeScript Support

Full type safety with TypeScript:

```typescript
import AEP from 'auto-envparse';

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

AEP.parse(config, { prefix: 'DB' });

// All types are preserved and enforced
const host: string = config.host;
const port: number = config.port;
const ssl: boolean = config.ssl;
```

### Dual Package Support

auto-envparse supports both CommonJS and ESM:

```typescript
// ESM (import) - Default export (recommended)
import AEP from 'auto-envparse';
AEP.parse(config, { prefix: 'DB' });

// ESM (import) - Named export
import { AutoEnvParse } from 'auto-envparse';
AutoEnvParse.parse(config, { prefix: 'DB' });

// CommonJS (require) - Default export
const AEP = require('auto-envparse').default;
AEP.parse(config, { prefix: 'DB' });

// CommonJS (require) - Named export
const { AutoEnvParse } = require('auto-envparse');
AutoEnvParse.parse(config, { prefix: 'DB' });
```

Works seamlessly in both module systems!

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
