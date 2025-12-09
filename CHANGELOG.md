# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-10

### Added
- Made `prefix` parameter optional - defaults to empty string (no prefix) for all parsing methods
- `createFrom()` method for creating and populating class instances from environment variables
- Exported `createFrom` as named export for convenient class-based configuration

### Changed
- **BREAKING**: Renamed default export from `autoEnv` to `parseEnv` for better clarity
- **BREAKING**: Removed utility function exports (`parseBoolean`, `parseNumber`, `toSnakeCase`, `coerceValue`, `loadNestedFromEnv`)
  - These utilities are still accessible via `AutoEnv.*` class methods for advanced use cases
  - Example: `AutoEnv.parseBoolean()`, `AutoEnv.toSnakeCase()`, etc.

### Migration Guide

**Updating imports:**
```typescript
// Before (v1.0.0)
import autoEnv from 'auto-envparse';
autoEnv(config, 'DB');

// After (v1.1.0)
import parseEnv from 'auto-envparse';
parseEnv(config, 'DB');
```

**Accessing utility functions:**
```typescript
// Before (v1.0.0)
import { parseBoolean, toSnakeCase } from 'auto-envparse';
parseBoolean('true');
toSnakeCase('poolSize');

// After (v1.1.0)
import { AutoEnv } from 'auto-envparse';
AutoEnv.parseBoolean('true');
AutoEnv.toSnakeCase('poolSize');
```

**Optional prefix (new feature):**
```typescript
// v1.1.0 - prefix is now optional
import parseEnv from 'auto-envparse';

const config = { host: 'localhost', port: 3000 };

// Without prefix - reads HOST and PORT from env
parseEnv(config);

// With prefix - reads DB_HOST and DB_PORT from env
parseEnv(config, 'DB');
```

## [1.0.0] - 2025-12-09

### Added
- Initial release of auto-envparse
- Zero-configuration environment variable parsing
- Automatic type inference from default values
- Type coercion for strings, numbers, and booleans
- CamelCase to SNAKE_CASE naming conversion
- Nested object support with dot-notation
- Custom override system for validation and complex parsing
- Full TypeScript support with type safety
- Dual package support (ESM + CommonJS)
- Comprehensive documentation and examples
- 100% test coverage

### Features
- `parse()` - Main function for automatic env var parsing
- `AutoEnv` class with static methods
- `loadNestedFromEnv()` - Load nested objects separately
- `parseBoolean()` - Parse boolean values with multiple formats
- `parseNumber()` - Parse number values with validation
- `toSnakeCase()` - Convert camelCase to snake_case
- `coerceValue()` - Type coercion utility

[1.0.0]: https://github.com/vlavrynovych/auto-envparse/releases/tag/v1.0.0
