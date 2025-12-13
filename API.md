# API Documentation

Complete API reference for auto-envparse v2.0.

## Table of Contents

- [Exports](#exports)
- [AutoEnvParse Class](#autoenvparse-class)
  - [parse()](#parse)
  - [enumValidator()](#enumvalidator)
  - [transform()](#transform)
  - [Utility Methods](#utility-methods)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Migration from v1.x](#migration-from-v1x)
- [Complete Example](#complete-example)

---

## Exports

auto-envparse provides a single class export with two methods you'll commonly use.

### Named Export

```typescript
import { AutoEnvParse } from 'auto-envparse';

AutoEnvParse.parse(config, 'DB');
```

### Default Export

```typescript
import AEP from 'auto-envparse';

AEP.parse(config, 'DB');
```

---

## AutoEnvParse Class

The main class containing all parsing functionality.

### parse()

Unified method that handles both plain objects and class constructors. Uses TypeScript overloads to provide excellent type inference.

#### Overload 1: Class Constructor

```typescript
static parse<T extends { new(): object }>(
    classConstructor: T,
    prefix?: string,
    overrides?: Map<string, (target: InstanceType<T>, envVarName: string) => void>
): InstanceType<T>
```

Creates a new instance from a class constructor and populates it with environment variables.

**Parameters:**
- **classConstructor**: `T extends { new(): object }`
  - A class constructor function with default values
  - Must be a class with a no-argument constructor

- **prefix**: `string` *(optional)*
  - Environment variable prefix (e.g., `'DB'`, `'APP'`, `'REDIS'`)
  - Must be uppercase letters and numbers only
  - **Default**: `''` (empty string - no prefix)

- **overrides**: `Map<string, (target: InstanceType<T>, envVarName: string) => void>` *(optional)*
  - Custom parsers for specific properties
  - Map keys are property names (camelCase)
  - Map values are validator/parser functions

**Returns:** `InstanceType<T>` - A new instance of the class with environment variables applied

**Example:**

```typescript
import { AutoEnvParse } from 'auto-envparse';

class DatabaseConfig {
    host = 'localhost';
    port = 5432;
    ssl = false;

    getConnectionString(): string {
        return `${this.host}:${this.port}`;
    }
}

// Environment: DB_HOST=prod.example.com, DB_PORT=5433, DB_SSL=true
const config = AutoEnvParse.parse(DatabaseConfig, 'DB');

console.log(config.host);                    // 'prod.example.com'
console.log(config.getConnectionString());   // 'prod.example.com:5433'
console.log(config instanceof DatabaseConfig); // true
```

#### Overload 2: Plain Object

```typescript
static parse<T extends object>(
    target: T,
    prefix?: string,
    overrides?: Map<string, (target: T, envVarName: string) => void>
): T
```

Populates a plain object with environment variables.

**Parameters:**
- **target**: `T extends object`
  - The configuration object to populate
  - Modified in-place and also returned
  - Can be any plain object

- **prefix**: `string` *(optional)*
  - Environment variable prefix (e.g., `'DB'`, `'APP'`, `'REDIS'`)
  - Must be uppercase letters and numbers only
  - **Default**: `''` (empty string - no prefix)

- **overrides**: `Map<string, (target: T, envVarName: string) => void>` *(optional)*
  - Custom parsers for specific properties

**Returns:** `T` - The same object that was passed in (modified in-place)

**Example:**

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    host: 'localhost',
    port: 5432,
    ssl: false,
    timeout: 30000
};

// Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
const result = AutoEnvParse.parse(config, 'DB');

console.log(result === config);  // true (same object)
console.log(config.host);        // 'example.com'
console.log(config.port);        // 3306
console.log(config.ssl);         // true
console.log(config.timeout);     // 30000 (unchanged - no DB_TIMEOUT set)
```

#### Environment Variable Naming

Property names are automatically converted from camelCase to SNAKE_CASE:

```typescript
const config = {
    apiUrl: 'http://localhost',
    maxRetries: 3,
    poolSize: 10,
    HTTPSEnabled: false
};

AutoEnvParse.parse(config, 'APP');

// Looks for environment variables:
// APP_API_URL
// APP_MAX_RETRIES
// APP_POOL_SIZE
// APP_HTTPS_ENABLED
```

#### Type Coercion

Values are automatically coerced based on the default value type:

| Default Type | Env Var Value | Result | Coerced Type |
|--------------|---------------|--------|--------------|
| `'localhost'` | `'example.com'` | `'example.com'` | `string` |
| `5432` | `'3306'` | `3306` | `number` |
| `false` | `'true'` | `true` | `boolean` |
| `['a']` | `'["x","y"]'` | `['x', 'y']` | `array` |
| `{ host: 'localhost' }` | `'{"host":"example.com"}'` | `{ host: 'example.com' }` | `object` |

**Boolean parsing** (case-insensitive):
- **Truthy**: `'true'`, `'1'`, `'yes'`, `'on'`
- **Falsy**: Everything else

**Array parsing**: Expects JSON format: `'["item1", "item2"]'`

**Object parsing**: Supports both JSON and dot-notation:
```typescript
// JSON format
APP_DATABASE='{"host":"example.com","port":5432}'

// Dot-notation
APP_DATABASE_HOST='example.com'
APP_DATABASE_PORT='5432'
```

#### Nested Objects

Supports deeply nested object structures with dot-notation:

```typescript
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

// Environment variables:
// APP_DATABASE_HOST=prod.example.com
// APP_DATABASE_PORT=5433
// APP_DATABASE_POOL_MIN=5
// APP_DATABASE_POOL_MAX=20
AutoEnvParse.parse(config, 'APP');

console.log(config.database.host);      // 'prod.example.com'
console.log(config.database.pool.min);  // 5
```

#### Nested Arrays

Arrays of objects support both JSON and dot-notation formats. Dot-notation takes priority when both are present.

**Basic Usage with Dot-Notation**:
```typescript
const config = {
    servers: [{
        host: 'localhost',
        port: 3000
    }]
};

// Environment variables (dot-notation):
// APP_SERVERS_0_HOST=server1.com
// APP_SERVERS_0_PORT=8080
// APP_SERVERS_1_HOST=server2.com
// APP_SERVERS_1_PORT=8081

AutoEnvParse.parse(config, 'APP');

console.log(config.servers);
// [
//   { host: 'server1.com', port: 8080 },
//   { host: 'server2.com', port: 8081 }
// ]
```

**Multilevel Nesting**:
```typescript
const config = {
    services: [{
        name: '',
        config: {
            database: {
                host: 'localhost',
                port: 5432
            }
        }
    }]
};

// APP_SERVICES_0_NAME=web
// APP_SERVICES_0_CONFIG_DATABASE_HOST=db1.com
// APP_SERVICES_0_CONFIG_DATABASE_PORT=5433
// APP_SERVICES_1_NAME=api
// APP_SERVICES_1_CONFIG_DATABASE_HOST=db2.com
// APP_SERVICES_1_CONFIG_DATABASE_PORT=5434

AutoEnvParse.parse(config, 'APP');

console.log(config.services[0].config.database.host); // 'db1.com'
```

**JSON Format** (also supported):
```typescript
// APP_SERVERS='[{"host":"server1.com","port":8080}]'
AutoEnvParse.parse(config, 'APP');
```

**Features**:
- **Sparse Arrays**: Indices `0, 2, 5` are automatically compacted to a 3-element array
- **Empty Arrays**: Skipped (require at least one template element for type inference)
- **RegExp Arrays**: Only support JSON format (dot-notation not applicable)
- **Type Coercion**: Works within array elements (strings → numbers, booleans, etc.)

#### Without Prefix

Omit the prefix parameter to use global environment variables:

```typescript
const config = {
    host: 'localhost',
    port: 3000,
    nodeEnv: 'development'
};

// Environment variables: HOST, PORT, NODE_ENV
AutoEnvParse.parse(config);

console.log(config.nodeEnv); // Uses NODE_ENV directly
```

#### With Custom Overrides

Add custom validation or parsing logic for specific properties:

```typescript
const config = {
    port: 3000,
    timeout: 5000
};

const overrides = new Map();

// Custom port validation
overrides.set('port', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const port = parseInt(value, 10);
        if (port >= 1 && port <= 65535) {
            obj.port = port;
        } else {
            throw new Error(`Port must be between 1-65535, got: ${port}`);
        }
    }
});

// Custom timeout with minimum value
overrides.set('timeout', (obj, envVar) => {
    const value = process.env[envVar];
    if (value) {
        const timeout = parseInt(value, 10);
        obj.timeout = Math.max(timeout, 1000); // Minimum 1 second
    }
});

AutoEnvParse.parse(config, 'APP', overrides);
```

---

### enumValidator()

Creates a validator function for enum-like values. Perfect for validating environment variables that must be one of a specific set of values.

#### Signature

```typescript
static enumValidator<T extends object>(
    propertyKey: string,
    allowedValues: string[],
    options?: { caseSensitive?: boolean }
): (target: T, envVarName: string) => void
```

#### Parameters

- **propertyKey**: `string`
  - The property name to validate
  - Must match the key in the config object

- **allowedValues**: `string[]`
  - Array of valid enum values
  - If the env var value is not in this list, throws an error

- **options**: `{ caseSensitive?: boolean }` *(optional)*
  - **caseSensitive**: `boolean` - Whether validation is case-sensitive
  - **Default**: `true`

#### Returns

A validator function for use with the `overrides` parameter in `parse()`.

#### Example: Single Enum Field

```typescript
import { AutoEnvParse } from 'auto-envparse';

type Environment = 'development' | 'staging' | 'production';

const config = {
    environment: 'development' as Environment
};

const overrides = new Map();
overrides.set('environment',
    AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production'])
);

// Environment: APP_ENVIRONMENT=production
AutoEnvParse.parse(config, 'APP', overrides);

console.log(config.environment); // 'production'

// If APP_ENVIRONMENT=invalid, throws:
// Error: Invalid value for APP_ENVIRONMENT: "invalid". Must be one of: development, staging, production
```

#### Example: Multiple Enum Fields

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
```

#### Example: Case-Insensitive Validation

```typescript
const config = {
    logLevel: 'info'
};

const overrides = new Map();
overrides.set('logLevel',
    AutoEnvParse.enumValidator('logLevel', ['debug', 'info', 'warn', 'error'], {
        caseSensitive: false
    })
);

// Environment: APP_LOG_LEVEL=DEBUG (any case works)
AutoEnvParse.parse(config, 'APP', overrides);

console.log(config.logLevel); // 'debug' (normalized to lowercase from allowedValues)
```

---

### transform()

Creates a transform function that applies custom transformations to environment variable values. Perfect for data formatting, validation, type conversion, or any custom logic you need to apply to raw string values.

#### Signature

```typescript
static transform<T extends object>(
    propertyKey: string,
    fn: (value: string) => any
): (target: T, envVarName: string) => void
```

#### Parameters

- **propertyKey**: `string`
  - The property name to transform
  - Must match the key in the config object

- **fn**: `(value: string) => any`
  - Transform function that receives the raw string from the environment variable
  - Returns the transformed value of any type
  - Can throw errors, which will be caught and logged as warnings

#### Returns

A transform function for use with the `overrides` parameter in `parse()`.

#### Example: Basic Transformations

```typescript
import { AutoEnvParse } from 'auto-envparse';

const config = {
    timeout: 30000,
    tags: [] as string[],
    retries: 3
};

const overrides = new Map([
    // Ensure minimum timeout value
    ['timeout', AutoEnvParse.transform('timeout', (val) =>
        Math.max(parseInt(val), 1000)
    )],

    // Split comma-separated values
    ['tags', AutoEnvParse.transform('tags', (val) =>
        val.split(',').map(t => t.trim())
    )],

    // Clamp retries between 1 and 10
    ['retries', AutoEnvParse.transform('retries', (val) => {
        const num = parseInt(val);
        return Math.max(1, Math.min(num, 10));
    })]
]);

// Environment: APP_TIMEOUT=500, APP_TAGS=alpha,beta,gamma, APP_RETRIES=15
AutoEnvParse.parse(config, 'APP', overrides);

console.log(config.timeout); // 1000 (clamped to minimum)
console.log(config.tags);    // ['alpha', 'beta', 'gamma']
console.log(config.retries); // 10 (clamped to maximum)
```

#### Example: Using External Libraries

Transform functions work seamlessly with external libraries for complex operations:

```typescript
import { AutoEnvParse } from 'auto-envparse';
import _ from 'lodash';
import moment from 'moment';

const config = {
    poolSize: 10,
    startDate: new Date(),
    allowedIPs: [] as string[]
};

const overrides = new Map([
    // Clamp with lodash
    ['poolSize', AutoEnvParse.transform('poolSize', (val) =>
        _.clamp(parseInt(val), 1, 100)
    )],

    // Parse dates with moment
    ['startDate', AutoEnvParse.transform('startDate', (val) =>
        moment(val, 'YYYY-MM-DD').toDate()
    )],

    // Filter and validate IP addresses
    ['allowedIPs', AutoEnvParse.transform('allowedIPs', (val) =>
        val.split(',')
           .map(ip => ip.trim())
           .filter(ip => /^[\d.]+$/.test(ip))
    )]
]);

// Environment:
// APP_POOL_SIZE=150
// APP_START_DATE=2024-12-25
// APP_ALLOWED_IPS=192.168.1.1, invalid, 10.0.0.1
AutoEnvParse.parse(config, 'APP', overrides);

console.log(config.poolSize);    // 100 (clamped by lodash)
console.log(config.startDate);   // Date object for 2024-12-25
console.log(config.allowedIPs);  // ['192.168.1.1', '10.0.0.1']
```

#### Example: JSON Parsing

```typescript
const config = {
    metadata: {} as Record<string, any>
};

const overrides = new Map([
    ['metadata', AutoEnvParse.transform('metadata', (val) => JSON.parse(val))]
]);

// Environment: APP_METADATA={"version":"1.0","enabled":true}
AutoEnvParse.parse(config, 'APP', overrides);

console.log(config.metadata); // { version: '1.0', enabled: true }
```

#### Error Handling

Transform errors are caught and logged as warnings, preserving the default value:

```typescript
const config = {
    data: null as any
};

const overrides = new Map([
    ['data', AutoEnvParse.transform('data', (val) => {
        if (!val) throw new Error('Value required');
        return JSON.parse(val);
    })]
]);

// Environment: APP_DATA=invalid-json
AutoEnvParse.parse(config, 'APP', overrides);
// Logs: Warning: Transform failed for APP_DATA: Unexpected token 'i'...

console.log(config.data); // null (default value preserved)
```

---

## Utility Methods

The following methods are available on the `AutoEnvParse` class for advanced use cases. These are typically not needed for normal usage but can be useful for custom parsing logic.

### parseBoolean()

Parse a string to boolean with flexible truthy/falsy values.

```typescript
static parseBoolean(value: string, strict?: boolean): boolean
```

**Parameters:**
- **value**: `string` - The string value to parse
- **strict**: `boolean` *(optional)* - If true, warns on unrecognized values. Default: `false`

**Truthy values** (case-insensitive): `'true'`, `'1'`, `'yes'`, `'on'`
**Falsy values** (case-insensitive): `'false'`, `'0'`, `'no'`, `'off'`
**Other values**: Return `false` (with optional warning in strict mode)

**Example:**

```typescript
AutoEnvParse.parseBoolean('true');   // true
AutoEnvParse.parseBoolean('YES');    // true
AutoEnvParse.parseBoolean('false');  // false
AutoEnvParse.parseBoolean('0');      // false
AutoEnvParse.parseBoolean('maybe');  // false
```

### parseNumber()

Parse a string to number.

```typescript
static parseNumber(value: string): number
```

Uses `parseFloat()` internally. Returns `NaN` if the value cannot be parsed.

**Example:**

```typescript
AutoEnvParse.parseNumber('42');       // 42
AutoEnvParse.parseNumber('3.14');     // 3.14
AutoEnvParse.parseNumber('invalid');  // NaN
```

### toSnakeCase()

Convert camelCase strings to snake_case.

```typescript
static toSnakeCase(str: string): string
```

Handles consecutive capitals properly (e.g., `'HTTPSPort'` → `'https_port'`).

**Example:**

```typescript
AutoEnvParse.toSnakeCase('poolSize');      // 'pool_size'
AutoEnvParse.toSnakeCase('maxRetries');    // 'max_retries'
AutoEnvParse.toSnakeCase('APIKey');        // 'api_key'
AutoEnvParse.toSnakeCase('HTTPSPort');     // 'https_port'
```

### coerceValue()

Coerce a string value to the specified type.

```typescript
static coerceValue(value: string, type: string): string | number | boolean
```

**Parameters:**
- **value**: `string` - The string value to coerce
- **type**: `string` - Target type: `'boolean'`, `'number'`, or `'string'`

**Example:**

```typescript
AutoEnvParse.coerceValue('true', 'boolean');   // true
AutoEnvParse.coerceValue('42', 'number');      // 42
AutoEnvParse.coerceValue('hello', 'string');   // 'hello'
```

### loadNestedFromEnv()

Load a nested object structure from dot-notation environment variables.

```typescript
static loadNestedFromEnv<T extends Record<string, any>>(
    prefix?: string,
    defaultValue: T
): T
```

**Parameters:**
- **prefix**: `string` *(optional)* - Environment variable prefix
- **defaultValue**: `T` - Default object structure (will be deep cloned)

**Returns:** A new object with environment variables applied.

**Example:**

```typescript
// Environment: APP_LOGGING_ENABLED=true, APP_LOGGING_MAX_FILES=20
const config = AutoEnvParse.loadNestedFromEnv('APP_LOGGING', {
    enabled: false,
    path: './logs',
    maxFiles: 10
});

console.log(config);
// {
//   enabled: true,
//   path: './logs',
//   maxFiles: 20
// }
```

---

## Best Practices

### 1. Use TypeScript for Type Safety

```typescript
interface DatabaseConfig {
    host: string;
    port: number;
    ssl: boolean;
}

const config: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    ssl: false
};

AutoEnvParse.parse(config, 'DB');

// TypeScript ensures all properties are typed correctly
```

### 2. Validate Enum Values

Always validate environment variables that accept only specific values:

```typescript
const overrides = new Map([
    ['environment', AutoEnvParse.enumValidator('environment', ['dev', 'staging', 'prod'])],
]);

AutoEnvParse.parse(config, 'APP', overrides);
```

### 3. Use Classes for Complex Configuration

Classes provide better encapsulation and can include methods:

```typescript
class AppConfig {
    host = '0.0.0.0';
    port = 3000;

    getUrl(): string {
        return `http://${this.host}:${this.port}`;
    }

    isProduction(): boolean {
        return process.env.NODE_ENV === 'production';
    }
}

const config = AutoEnvParse.parse(AppConfig, 'APP');
console.log(config.getUrl());
```

### 4. Provide Sensible Defaults

Always provide default values in your configuration:

```typescript
const config = {
    host: 'localhost',          // Good default for local development
    port: 3000,                 // Standard port
    debug: false,               // Safe default
    timeout: 30000,             // Reasonable timeout
    retries: 3                  // Sensible retry count
};
```

### 5. Use Prefixes to Organize Variables

Group related environment variables with prefixes:

```typescript
// Database configuration
const dbConfig = AutoEnvParse.parse({ host: 'localhost', port: 5432 }, 'DB');

// Redis configuration
const redisConfig = AutoEnvParse.parse({ host: 'localhost', port: 6379 }, 'REDIS');

// App configuration
const appConfig = AutoEnvParse.parse({ port: 3000, debug: false }, 'APP');
```

---

## Error Handling

### Invalid Prefix Format

```typescript
// Throws: Error: Invalid prefix "db-app". Use uppercase letters and numbers only.
AutoEnvParse.parse(config, 'db-app');
```

Prefixes must match: `/^[A-Z0-9]+$/`

### Enum Validation Errors

```typescript
const overrides = new Map([
    ['env', AutoEnvParse.enumValidator('env', ['dev', 'prod'])],
]);

// Environment: APP_ENV=staging
// Throws: Error: Invalid value for APP_ENV: "staging". Must be one of: dev, prod
AutoEnvParse.parse(config, 'APP', overrides);
```

### Invalid JSON

```typescript
const config = {
    data: { key: 'value' }
};

// Environment: APP_DATA='invalid json'
// Logs: Warning: Invalid APP_DATA JSON. Using dot-notation if available.
// Falls back to dot-notation: APP_DATA_KEY
AutoEnvParse.parse(config, 'APP');
```

---

## Migration from v1.x

### Import Changes

```typescript
// v1.x
import parseEnv, { parse, createFrom, AutoEnv } from 'auto-envparse';

// v2.0
import { AutoEnvParse } from 'auto-envparse';
// or
import AEP from 'auto-envparse';
```

### Method Changes

```typescript
// v1.x - Multiple methods
parseEnv(config, 'DB');
const instance = createFrom(DbClass, 'DB');
AutoEnv.parseBoolean('true');

// v2.0 - Unified method
AutoEnvParse.parse(config, 'DB');
const instance = AutoEnvParse.parse(DbClass, 'DB');
AutoEnvParse.parseBoolean('true');
```

### Return Value

```typescript
// v1.x - No return value
const config = { host: 'localhost' };
parseEnv(config, 'DB');
console.log(config.host);

// v2.0 - Returns the object
const config = AutoEnvParse.parse({ host: 'localhost' }, 'DB');
console.log(config.host);
```

---

## Complete Example

```typescript
import { AutoEnvParse } from 'auto-envparse';

// Define configuration class
class ApplicationConfig {
    // Server settings
    host = '0.0.0.0';
    port = 3000;

    // Database settings
    database = {
        host: 'localhost',
        port: 5432,
        name: 'myapp',
        ssl: false
    };

    // Application settings
    environment: 'development' | 'staging' | 'production' = 'development';
    debug = false;
    logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

    // Methods
    getServerUrl(): string {
        return `http://${this.host}:${this.port}`;
    }

    getDatabaseUrl(): string {
        const protocol = this.database.ssl ? 'postgres' : 'postgresql';
        return `${protocol}://${this.database.host}:${this.database.port}/${this.database.name}`;
    }
}

// Set up validators
const overrides = new Map([
    ['environment', AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production'])],
    ['logLevel', AutoEnvParse.enumValidator('logLevel', ['debug', 'info', 'warn', 'error'])],
]);

// Parse configuration
const config = AutoEnvParse.parse(ApplicationConfig, 'APP', overrides);

// Use configuration
console.log('Server URL:', config.getServerUrl());
console.log('Database URL:', config.getDatabaseUrl());
console.log('Environment:', config.environment);
console.log('Debug mode:', config.debug);

// Environment variables used:
// APP_HOST, APP_PORT
// APP_DATABASE_HOST, APP_DATABASE_PORT, APP_DATABASE_NAME, APP_DATABASE_SSL
// APP_ENVIRONMENT, APP_DEBUG, APP_LOG_LEVEL
```

---

## License

MIT © [Volodymyr Lavrynovych](https://github.com/vlavrynovych)
