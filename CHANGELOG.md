# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-09

### BREAKING CHANGES

**API Refactoring (#13):**
- **Default export renamed**: `autoEnv()` → `parseEnv()`
  ```typescript
  // Before
  import autoEnv from 'auto-envparse';
  autoEnv(config, 'APP');

  // After
  import parseEnv from 'auto-envparse';
  parseEnv(config, 'APP');
  ```

- **Utility functions no longer exported as named exports**: Access via `AutoEnv` class instead
  ```typescript
  // Before
  import { parseBoolean, parseNumber, toSnakeCase, coerceValue, loadNestedFromEnv } from 'auto-envparse';
  parseBoolean('true');

  // After
  import { AutoEnv } from 'auto-envparse';
  AutoEnv.parseBoolean('true');
  ```

- **Migration guide**:
  1. Replace all `import autoEnv from 'auto-envparse'` with `import parseEnv from 'auto-envparse'`
  2. Replace all `autoEnv(...)` calls with `parseEnv(...)`
  3. Replace named utility imports with `AutoEnv.*` access pattern
  4. The `parse` alias continues to work: `import { parse } from 'auto-envparse'`

### Added
- **Optional prefix parameter** (#2, #5) for `parseEnv()`, `parse()`, `AutoEnv.parse()`, and `AutoEnv.loadNestedFromEnv()`
- **Support for parsing without prefix** - Use environment variables without a prefix (e.g., `HOST`, `PORT` instead of `APP_HOST`, `APP_PORT`)
- **`createFrom()` function** (#5) - Convenience function to create and populate class instances in one step
- **Internal `buildEnvVarName()` helper** - Conditional prefix handling
- **Enhanced test coverage** - 55 tests total with 100% coverage across all metrics

### Changed
- `prefix` parameter is now optional in all parsing methods (defaults to empty string)
- Removed defensive checks in `applyNestedObject` and `applyComplexObject` for better testability
- Updated all documentation with new API naming and examples for both prefixed and non-prefixed usage

### Fixed
- Edge case handling for complex objects with empty prefix

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

[1.1.0]: https://github.com/vlavrynovych/auto-envparse/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/vlavrynovych/auto-envparse/releases/tag/v1.0.0
