# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-12-10

### Fixed
- **CommonJS/ESM dual-package exports** (#14) - Fixed package.json exports configuration to properly support both CommonJS and ESM
  - `main` now points to `./dist/index.cjs` (CommonJS entry)
  - `module` now points to `./dist/index.js` (ESM entry)
  - `exports.require` now points to `./dist/index.cjs`
  - `exports.import` now points to `./dist/index.js`
  - This fixes compatibility with CommonJS projects (like MSR) that use `require()`

## [1.1.0] - 2025-12-10

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
- **Prefix validation** (#13) - Validates prefix format (uppercase letters and numbers only)
- **Defensive error checking** (#13) - Throws descriptive errors for invalid inputs in private methods
- **Class-based configuration example** to README's "Why auto-envparse?" section

### Changed
- `prefix` parameter is now optional in all parsing methods (defaults to empty string)
- Updated all documentation with new API naming and examples for both prefixed and non-prefixed usage

### Improved
- **Deep cloning in `loadNestedFromEnv`** (#13) - Prevents mutation of default values using `JSON.parse(JSON.stringify())`
- **Cross-realm object detection** (#13) - New `isPlainObject()` helper using `Object.getPrototypeOf()` for reliable detection across iframe/VM boundaries
- **`toSnakeCase` for consecutive capitals** (#13) - Handles sequences like `XMLParser` → `xml_parser` and `HTTPSPort` → `https_port`
- **Recursive `applyComplexObject`** (#13) - Supports deeply nested class instances
- **JSON validation before mutation** (#13) - Validates parsed JSON is an object before applying to prevent corruption
- **Test coverage to 100%** (#13) - 73 tests with complete coverage across all metrics (statement, branch, function, line)

### Fixed
- Edge case handling for complex objects with empty prefix
- Shallow copy bug causing reference sharing between multiple `loadNestedFromEnv` calls

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

[1.1.1]: https://github.com/vlavrynovych/auto-envparse/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/vlavrynovych/auto-envparse/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/vlavrynovych/auto-envparse/releases/tag/v1.0.0
