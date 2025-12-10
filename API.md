# API Documentation

Complete API reference for auto-envparse.

## Table of Contents

- [Default Export: parseEnv()](#default-export-parseenv)
- [Named Exports](#named-exports)
  - [parse()](#parse)
  - [createFrom()](#createfrom)
  - [AutoEnv Class](#autoenv-class)

---

## Default Export: parseEnv()

The main entry point for auto-envparse.

### Signature

```typescript
function parseEnv<T extends object>(
    target: T,
    prefix?: string,
    overrides?: Map<string, (target: T, envVarName: string) => void>
): void
```

### Parameters

- **target**: `T extends object`
  - The configuration object to populate from environment variables
  - Modified in-place
  - Type: Any object with properties

- **prefix**: `string` *(optional)*
  - Environment variable prefix (e.g., `'DB'`, `'APP'`, `'REDIS'`)
  - Used to generate env var names: `PREFIX_PROPERTY_NAME`
  - Case-insensitive (will be uppercased automatically)
  - **Default**: `''` (empty string - no prefix)
  - When omitted, environment variables are used without a prefix (e.g., `HOST`, `PORT`)

- **overrides**: `Map<string, (target: T, envVarName: string) => void>` *(optional)*
  - Custom parsers for specific properties
  - Map keys are property names (camelCase)
  - Map values are parser functions that receive:
    - `target`: The configuration object
    - `envVarName`: The computed environment variable name

### Returns

`void` - The function modifies the target object in-place.

### Example with Prefix

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
parseEnv(config, 'DB');

console.log(config);
// {
//   host: 'example.com',
//   port: 3306,
//   ssl: true
// }
```

### Example without Prefix

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 3000,
    nodeEnv: 'development'
};

// Environment: HOST=production.com, PORT=8080, NODE_ENV=production
parseEnv(config);

console.log(config);
// {
//   host: 'production.com',
//   port: 8080,
//   nodeEnv: 'production'
// }
```

### With Overrides

```typescript
import parseEnv from 'auto-envparse';

const config = {
    port: 3000,
    environment: 'development'
};

const overrides = new Map();

overrides.set('environment', (obj, envVar) => {
    const value = process.env[envVar];
    const validEnvs = ['development', 'staging', 'production'];

    if (value && validEnvs.includes(value)) {
        obj.environment = value;
    } else {
        throw new Error(`Invalid environment: ${value}`);
    }
});

parseEnv(config, 'APP', overrides);
```

---

## Named Exports

### parse()

Alias for the default `parseEnv` function. Useful if you prefer the `parse` naming.

```typescript
import { parse } from 'auto-envparse';

// With prefix
const config = { host: 'localhost', port: 5432 };
parse(config, 'DB');

// Without prefix
const globalConfig = { nodeEnv: 'development', port: 3000 };
parse(globalConfig);
```

**Note:** `parse` and `parseEnv` are the same function. Use whichever name you prefer.

---

### createFrom()

Convenience function to create and populate an instance from a class constructor.

```typescript
function createFrom<T extends { new(): object }>(
    classConstructor: T,
    prefix?: string,
    overrides?: Map<string, (target: InstanceType<T>, envVarName: string) => void>
): InstanceType<T>
```

Equivalent to `AutoEnv.createFrom()`. See [AutoEnv.createFrom()](#autoenvcreatefrom) for details.

---

### AutoEnv Class

The core class that provides all parsing functionality.

#### AutoEnv.parse()

Same as the default export `parseEnv()` function.

```typescript
class AutoEnv {
    static parse<T extends object>(
        target: T,
        prefix?: string,
        overrides?: Map<string, (target: T, envVarName: string) => void>
    ): void;
}
```

**Example:**

```typescript
import { AutoEnv } from 'auto-envparse';

// With prefix
const config = { host: 'localhost', port: 5432 };
AutoEnv.parse(config, 'DB');

// Without prefix
const simpleConfig = { host: 'localhost', port: 3000 };
AutoEnv.parse(simpleConfig);
```

---

#### AutoEnv.loadNestedFromEnv()

Load a nested object from dot-notation environment variables.

```typescript
class AutoEnv {
    static loadNestedFromEnv<T extends Record<string, any>>(
        prefix?: string,
        defaultValue: T
    ): T;
}
```

**Parameters:**

- **prefix**: `string` *(optional)*
  - Environment variable prefix (e.g., `'APP_LOGGING'`)
  - Used to look for env vars: `PREFIX_KEY`
  - **Default**: `''` (empty string - no prefix)
  - When omitted, looks for env vars without prefix

- **defaultValue**: `T extends Record<string, any>`
  - Default object with property types
  - Used for type inference

**Returns:**

`T` - New object with values from environment variables or defaults

**Example with Prefix:**

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

**Example without Prefix:**

```typescript
import { AutoEnv } from 'auto-envparse';

// Environment: ENABLED=true, MAX_CONNECTIONS=50
const serverConfig = AutoEnv.loadNestedFromEnv('', {
    enabled: false,
    maxConnections: 10,
    timeout: 5000
});

console.log(serverConfig);
// {
//   enabled: true,
//   maxConnections: 50,
//   timeout: 5000
// }
```

---

#### AutoEnv.createFrom()

Create and populate an instance from a class constructor.

```typescript
class AutoEnv {
    static createFrom<T extends { new(): object }>(
        classConstructor: T,
        prefix?: string,
        overrides?: Map<string, (target: InstanceType<T>, envVarName: string) => void>
    ): InstanceType<T>;
}
```

**Parameters:**

- **classConstructor**: `T extends { new(): object }`
  - Class constructor function with default values
  - Must have a parameterless constructor
  - Properties should have default values defined

- **prefix**: `string` *(optional)*
  - Environment variable prefix (e.g., `'DB'`, `'APP'`)
  - **Default**: `''` (empty string - no prefix)
  - When omitted, looks for env vars without prefix

- **overrides**: `Map<string, (target: InstanceType<T>, envVarName: string) => void>` *(optional)*
  - Custom parsers for specific properties
  - Same as `parse()` overrides

**Returns:**

`InstanceType<T>` - New instance of the class populated from environment variables

**Example with Prefix:**

```typescript
import { createFrom } from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;
    poolSize = 10;
}

// Environment: DB_HOST=prod.example.com, DB_PORT=5433, DB_SSL=true
const config = createFrom(DatabaseConfig, 'DB');

console.log(config);
// DatabaseConfig {
//   host: 'prod.example.com',
//   port: 5433,
//   ssl: true,
//   poolSize: 10
// }
```

**Example without Prefix:**

```typescript
import { createFrom } from 'auto-envparse';

class AppConfig {
    nodeEnv = 'development';
    port = 3000;
    debug = false;
}

// Environment: NODE_ENV=production, PORT=8080, DEBUG=true
const config = createFrom(AppConfig);

console.log(config);
// AppConfig {
//   nodeEnv: 'production',
//   port: 8080,
//   debug: true
// }
```

**Example with Methods:**

```typescript
import { createFrom } from 'auto-envparse';

class ServerConfig {
    host = '0.0.0.0';
    port = 3000;

    getUrl(): string {
        return `http://${this.host}:${this.port}`;
    }
}

// Environment: SERVER_HOST=example.com, SERVER_PORT=8080
const config = createFrom(ServerConfig, 'SERVER');

console.log(config.getUrl()); // 'http://example.com:8080'
```

**Example with Overrides:**

```typescript
import { createFrom } from 'auto-envparse';

class ApiConfig {
    port = 3000;
    environment = 'development';
}

const overrides = new Map();
overrides.set('environment', (obj, envVar) => {
    const value = process.env[envVar];
    const validEnvs = ['development', 'staging', 'production'];
    if (value && validEnvs.includes(value)) {
        obj.environment = value;
    } else {
        throw new Error(`Invalid environment: ${value}`);
    }
});

const config = createFrom(ApiConfig, 'API', overrides);
```

**Use Cases:**

- **Existing codebases** - You already have classes with defaults defined
- **Less boilerplate** - No need to manually instantiate then parse
- **Type safety** - Returns properly typed class instance
- **MSR-style projects** - Projects using class-based configuration

---

#### AutoEnv.coerceValue()

Convert a string value to the specified type.

```typescript
class AutoEnv {
    static coerceValue(
        value: string,
        type: string
    ): string | number | boolean;
}
```

**Parameters:**

- **value**: `string` - String value from environment variable
- **type**: `string` - Target type (`'boolean'`, `'number'`, `'string'`)

**Returns:**

`string | number | boolean` - Coerced value

**Example:**

```typescript
import { AutoEnv } from 'auto-envparse';

AutoEnv.coerceValue('42', 'number');    // 42
AutoEnv.coerceValue('true', 'boolean'); // true
AutoEnv.coerceValue('hello', 'string'); // 'hello'
```

---

#### AutoEnv.parseBoolean()

Parse a string to boolean.

```typescript
class AutoEnv {
    static parseBoolean(value: string): boolean;
}
```

**Parameters:**

- **value**: `string` - String value to parse

**Returns:**

`boolean` - Parsed boolean value

**Truthy values** (case-insensitive):
- `'true'`, `'1'`, `'yes'`, `'on'`

**Falsy values**:
- Everything else

**Example:**

```typescript
import { AutoEnv } from 'auto-envparse';

AutoEnv.parseBoolean('true');   // true
AutoEnv.parseBoolean('TRUE');   // true
AutoEnv.parseBoolean('1');      // true
AutoEnv.parseBoolean('yes');    // true
AutoEnv.parseBoolean('false');  // false
AutoEnv.parseBoolean('0');      // false
AutoEnv.parseBoolean('random'); // false
```

---

#### AutoEnv.parseNumber()

Parse a string to number.

```typescript
class AutoEnv {
    static parseNumber(value: string): number;
}
```

**Parameters:**

- **value**: `string` - String value to parse

**Returns:**

`number` - Parsed number or `NaN` if invalid

**Example:**

```typescript
import { AutoEnv } from 'auto-envparse';

AutoEnv.parseNumber('42');      // 42
AutoEnv.parseNumber('3.14');    // 3.14
AutoEnv.parseNumber('-10');     // -10
AutoEnv.parseNumber('invalid'); // NaN
```

---

#### AutoEnv.toSnakeCase()

Convert camelCase to snake_case.

```typescript
class AutoEnv {
    static toSnakeCase(str: string): string;
}
```

**Parameters:**

- **str**: `string` - camelCase string

**Returns:**

`string` - snake_case string

**Example:**

```typescript
import { AutoEnv } from 'auto-envparse';

AutoEnv.toSnakeCase('poolSize');         // 'pool_size'
AutoEnv.toSnakeCase('maxRetries');       // 'max_retries'
AutoEnv.toSnakeCase('connectionTimeout'); // 'connection_timeout'
AutoEnv.toSnakeCase('host');             // 'host'
```

---

## Type Coercion Details

### Supported Types

| Type | Detection | Conversion |
|------|-----------|------------|
| `string` | `typeof value === 'string'` | No conversion |
| `number` | `typeof value === 'number'` | `parseFloat(envVar)` |
| `boolean` | `typeof value === 'boolean'` | See [Boolean Parsing](#boolean-parsing) |
| `null` | `value === null` | Treated as string |
| `undefined` | `value === undefined` | Treated as string |
| `array` | `Array.isArray(value)` | `JSON.parse(envVar)` |
| `object` | `typeof value === 'object'` | Nested parsing |

### Boolean Parsing

Boolean parsing is case-insensitive and supports multiple formats:

| Input | Result |
|-------|--------|
| `'true'`, `'TRUE'` | `true` |
| `'1'` | `true` |
| `'yes'`, `'YES'` | `true` |
| `'on'`, `'ON'` | `true` |
| `'false'`, `'FALSE'` | `false` |
| `'0'` | `false` |
| `'no'`, `'NO'` | `false` |
| `'off'`, `'OFF'` | `false` |
| Any other value | `false` |

### Array Parsing

Arrays expect JSON format in environment variables:

```bash
# String array
export APP_TAGS='["tag1", "tag2", "tag3"]'

# Number array
export APP_NUMBERS='[1, 2, 3, 4, 5]'

# Mixed array
export APP_MIXED='["string", 42, true]'
```

**Code:**

```typescript
const config = {
    tags: ['default'],
    numbers: [0]
};

parse(config, 'APP');

console.log(config.tags);    // ['tag1', 'tag2', 'tag3']
console.log(config.numbers); // [1, 2, 3, 4, 5]
```

### Nested Object Parsing

Nested objects support two formats:

1. **Dot-notation** (recommended):

```bash
export DB_POOL_MIN=5
export DB_POOL_MAX=50
export DB_POOL_IDLE_TIMEOUT=30000
```

2. **JSON format**:

```bash
export DB_POOL='{"min": 5, "max": 50, "idleTimeout": 30000}'
```

**Note:** Dot-notation takes precedence over JSON format.

---

## Custom Overrides

Custom overrides allow you to add validation, transformation, or complex parsing logic for specific properties.

### Override Function Signature

```typescript
type OverrideFunction<T> = (
    target: T,
    envVarName: string
) => void
```

### Parameters

- **target**: `T` - The configuration object (modify in-place)
- **envVarName**: `string` - The computed environment variable name

### Example: Port Validation

```typescript
import parseEnv from 'auto-envparse';

const config = {
    port: 3000
};

const overrides = new Map();

overrides.set('port', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const port = parseInt(value, 10);
        if (port >= 1 && port <= 65535) {
            obj.port = port;
        } else {
            throw new Error(`Port must be between 1 and 65535, got: ${port}`);
        }
    }
});

parseEnv(config, 'APP', overrides);
```

### Example: Enum Validation

```typescript
import parseEnv from 'auto-envparse';

type Environment = 'development' | 'staging' | 'production';

const config = {
    environment: 'development' as Environment
};

const overrides = new Map();

overrides.set('environment', (obj, envVar) => {
    const value = process.env[envVar];
    const validEnvs: Environment[] = ['development', 'staging', 'production'];

    if (value && validEnvs.includes(value as Environment)) {
        obj.environment = value as Environment;
    } else if (value) {
        throw new Error(`Invalid environment: ${value}. Must be one of: ${validEnvs.join(', ')}`);
    }
});

parseEnv(config, 'APP', overrides);
```

### Example: Complex Transformation

```typescript
import parseEnv from 'auto-envparse';

const config = {
    allowedOrigins: ['http://localhost:3000']
};

const overrides = new Map();

overrides.set('allowedOrigins', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        // Support both comma-separated and JSON array formats
        if (value.startsWith('[')) {
            obj.allowedOrigins = JSON.parse(value);
        } else {
            obj.allowedOrigins = value.split(',').map(s => s.trim());
        }
    }
});

parseEnv(config, 'APP', overrides);

// Supports both:
// APP_ALLOWED_ORIGINS='["https://example.com", "https://app.example.com"]'
// APP_ALLOWED_ORIGINS='https://example.com, https://app.example.com'
```

---

## Error Handling

auto-envparse does not throw errors by default for missing environment variables or invalid values. It follows a "fail-silent" approach, preserving default values when:

- Environment variable is not set
- Environment variable is empty string
- Type coercion fails (e.g., `NaN` for invalid numbers)

To add validation and error handling, use [custom overrides](#custom-overrides).

---

## TypeScript Types

### Generic Constraints

```typescript
// parseEnv() accepts any object
function parseEnv<T extends object>(target: T, ...): void

// loadNestedFromEnv() accepts record-like objects
function loadNestedFromEnv<T extends Record<string, any>>(
    prefix: string,
    defaultValue: T
): T
```

### Type Safety

auto-envparse preserves TypeScript types:

```typescript
interface DatabaseConfig {
    host: string;
    port: number;
    ssl: boolean;
    pool: {
        min: number;
        max: number;
    };
}

const config: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    ssl: false,
    pool: {
        min: 2,
        max: 10
    }
};

parseEnv(config, 'DB');

// All types are preserved:
const host: string = config.host;
const port: number = config.port;
const ssl: boolean = config.ssl;
const poolMin: number = config.pool.min;
```

---

## Best Practices

### 1. Define Sensible Defaults

Always provide sensible default values in your config object. auto-envparse uses these for type inference.

```typescript
// ✅ Good
const config = {
    timeout: 5000,        // Clear default
    retries: 3,           // Clear default
    debug: false          // Clear default
};

// ❌ Bad
const config = {
    timeout: 0,           // Unclear if 0 is valid
    retries: undefined,   // No type information
    debug: null           // No type information
};
```

### 2. Use Consistent Prefixes

Use consistent, descriptive prefixes for related configuration:

```typescript
// ✅ Good
parseEnv(databaseConfig, 'DATABASE');
parseEnv(redisConfig, 'REDIS');
parseEnv(authConfig, 'AUTH');

// ❌ Bad
parseEnv(databaseConfig, 'DB');
parseEnv(redisConfig, 'CACHE');
parseEnv(authConfig, 'LOGIN');
```

### 3. Document Environment Variables

Document all environment variables your application uses:

```typescript
/**
 * Database configuration
 *
 * Environment variables:
 * - DATABASE_HOST: Database host (default: localhost)
 * - DATABASE_PORT: Database port (default: 5432)
 * - DATABASE_SSL: Enable SSL (default: false)
 */
const databaseConfig = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

parseEnv(databaseConfig, 'DATABASE');
```

### 4. Use Overrides for Validation

Add validation for critical or sensitive configuration:

```typescript
const overrides = new Map();

// Validate port range
overrides.set('port', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const port = parseInt(value, 10);
        if (port < 1 || port > 65535) {
            throw new Error(`Invalid port: ${port}`);
        }
        obj.port = port;
    }
});

// Validate required fields
overrides.set('apiKey', (obj, envVar) => {
    const value = process.env[envVar];
    if (!value) {
        throw new Error(`${envVar} is required`);
    }
    obj.apiKey = value;
});
```

### 5. Group Related Configuration

Group related configuration properties in nested objects:

```typescript
const config = {
    server: {
        port: 3000,
        host: '0.0.0.0'
    },
    database: {
        host: 'localhost',
        port: 5432
    },
    redis: {
        host: 'localhost',
        port: 6379
    }
};

parseEnv(config, 'APP');

// Environment variables:
// APP_SERVER_PORT
// APP_SERVER_HOST
// APP_DATABASE_HOST
// APP_DATABASE_PORT
// APP_REDIS_HOST
// APP_REDIS_PORT
```

---

## Migration from Other Libraries

### From envalid

**envalid:**

```typescript
import { cleanEnv, str, num, bool } from 'envalid';

const config = cleanEnv(process.env, {
    HOST: str({ default: 'localhost' }),
    PORT: num({ default: 5432 }),
    SSL: bool({ default: false })
});
```

**auto-envparse:**

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

parseEnv(config, 'DB');
```

### From convict

**convict:**

```typescript
import convict from 'convict';

const config = convict({
    host: {
        format: String,
        default: 'localhost',
        env: 'DB_HOST'
    },
    port: {
        format: 'port',
        default: 5432,
        env: 'DB_PORT'
    }
});

config.validate();
```

**auto-envparse:**

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432
};

parseEnv(config, 'DB');
```

### From dotenv

**dotenv:**

```typescript
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.DB_SSL === 'true'
};
```

**auto-envparse:**

```typescript
import parseEnv from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

parseEnv(config, 'DB');
```

---

## License

MIT © [Volodymyr Lavrynovych](https://github.com/vlavrynovych)
