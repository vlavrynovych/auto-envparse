# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-01-14

### BREAKING CHANGES

**Remove deprecated v2.0 backward compatibility API (#32):**

The old v2.0 signature that accepted `prefix` as a string and `overrides` as separate parameters has been removed. Only the options-based API introduced in v2.1 is now supported.

```typescript
// ❌ v2.x - REMOVED
AutoEnvParse.parse(config, 'DB');
AutoEnvParse.parse(config, 'DB', overrides);

// ✅ v3.0 - Use this
AutoEnvParse.parse(config, { prefix: 'DB' });
AutoEnvParse.parse(config, { prefix: 'DB', overrides });
```

**Migration Guide:**

Simple prefix usage:
```typescript
// Before (v2.x)
const config = AutoEnvParse.parse(myConfig, 'DB');

// After (v3.0)
const config = AutoEnvParse.parse(myConfig, { prefix: 'DB' });
```

With overrides:
```typescript
// Before (v2.x)
const config = AutoEnvParse.parse(myConfig, 'DB', overrides);

// After (v3.0)
const config = AutoEnvParse.parse(myConfig, { prefix: 'DB', overrides });
```

No prefix (default):
```typescript
// Before (v2.x)
const config = AutoEnvParse.parse(myConfig);

// After (v3.0) - no change needed!
const config = AutoEnvParse.parse(myConfig);
```

**Automated Migration:**

Use find/replace with regex:
- Find: `\.parse\(([^,]+),\s*'([^']+)'\)`
- Replace: `.parse($1, { prefix: '$2' })`

### Removed
- **v2.0 API signature** - `parse(target, prefix, overrides)` removed in favor of `parse(target, options)`
- **Conditional logic** - Simplified implementation by removing string vs options detection

### Changed
- **API Documentation** - Updated all examples to use options-based API
- **README** - Added v3.0 migration guide

### Benefits
- ✅ **Cleaner API** - Single consistent interface
- ✅ **Better extensibility** - Easy to add new options without changing signature
- ✅ **Less confusion** - One clear way to call the function
- ✅ **Reduced bundle size** - Simpler implementation (~40 lines removed)
- ✅ **Future-proof** - New features can be added via options object

## [2.1.1] - 2026-01-13

### Changed
- **Workflow improvements** - Switched to tag-based npm publishing workflow with provenance support
- **prepublishOnly hook** - Enhanced to run lint, typecheck, test, and build

### Fixed
- **Dependency updates** - Updated TypeScript ESLint tooling, Node types, ESLint, and globals

## [2.1.0] - 2025-12-13

### Added

**Transform Functions (#18):**
- **`transform()` static method** - Create custom transformation functions for environment variable values
- Support for external libraries (lodash, moment, etc.) for transformations
- Graceful error handling with console warnings for failed transformations
- Documentation in README.md and API.md with comprehensive examples

**Nested Array Support (#19):**
- **Dot-notation for arrays of objects** - Configure arrays using indexed env vars (e.g., `APP_SERVERS_0_HOST=value`)
- **Multilevel nesting support** - Deep nesting in array elements (e.g., `APP_SERVICES_0_CONFIG_DATABASE_HOST=db.com`)
- **Sparse array handling** - Non-contiguous indices automatically compacted (indices `0, 2, 5` → 3-element array)
- **Priority system** - Dot-notation takes precedence over JSON when both formats exist
- **Backward compatibility** - JSON format continues to work perfectly
- **RegExp array support** - Automatically detected and handled via JSON only
- **Empty array handling** - Empty arrays skipped (require template element for type inference)
- Zero configuration - Works automatically with existing array properties

**.env File Loading Support (#17):**
- **`ParseOptions` interface** - Modern options-based API with `{ prefix, overrides, sources, envFileParser }`
- **Multi-source loading** - Load from multiple sources with configurable priority (e.g., `sources: ['env', '.env', '.env.local']`)
- **Priority system** - First source in array takes precedence (flexible override strategy)
- **Default behavior** - Auto-loads from `['env', '.env']` by default
- **Custom parsers** - "Bring your own parser" via `envFileParser` option (e.g., dotenv.parse)
- **Built-in parser** - Lightweight fallback parser for basic .env files (supports KEY=value, comments, quotes)
- **Missing file handling** - Warns via `console.warn()` when files not found (continues execution)
- **Backward compatibility** - v2.0 API signature (`parse(target, prefix, overrides)`) still works perfectly
- Zero dependencies by default - Use built-in parser or provide your own (dotenv, etc.)

### Changed
- **Test organization** (#17, #18) - Split monolithic 1390-line test file into 9 logical files:
  - `test/parse-object.test.ts` (22 tests)
  - `test/parse-class.test.ts` (13 tests)
  - `test/overrides.test.ts` (15 tests - enumValidator + transform)
  - `test/utilities.test.ts` (19 tests)
  - `test/examples.test.ts` (2 tests)
  - `test/coverage-complete.test.ts` (31 tests)
  - `test/nested-arrays.test.ts` (21 tests)
  - `test/env-file-loading.test.ts` (23 tests - new)
  - `test/index.test.ts` (18 tests - existing)
- **API signature** (#17) - `parse()` now accepts options object as second parameter (backward compatible with v2.0 signature)

### Improved
- **Code refactoring** (#17, #19) - Extracted helper methods for better maintainability:
  - `detectArrayIndices()` - Scans environment for array index patterns
  - `parseArrayElement()` - Parses individual array elements with type coercion
  - `parseObjectPropertiesRecursive()` - Handles deep nesting in array elements
  - `loadSources()` - Loads and merges environment variables from multiple sources
  - `parseEnvFile()` - Built-in lightweight .env file parser
- **Test coverage** - Maintained 99%+ coverage across all metrics (164 tests total)
- **Documentation** - Comprehensive examples for transform functions, nested arrays, and .env file loading

### Benefits
- ✅ **More powerful transformations** - Leverage any external library for value processing
- ✅ **Complex array configurations** - Configure arrays of objects naturally via environment variables
- ✅ **.env file support** - Load configuration from .env files with zero dependencies
- ✅ **Multi-source loading** - Flexible priority system for environment variable sources
- ✅ **Better maintainability** - Well-organized test suite and cleaner codebase
- ✅ **Zero breaking changes** - All existing code continues to work

## [2.0.0] - 2025-12-11

### BREAKING CHANGES

**Major API Redesign (#15):**

This release simplifies the API to have one clear, unified entry point. The goal is to make the library easier to learn and use.

#### 1. Class Renamed: `AutoEnv` → `AutoEnvParse`
The main class has been renamed to better align with the package name.

```typescript
// Before (v1.x)
import { AutoEnv } from 'auto-envparse';
AutoEnv.parse(config, 'DB');

// After (v2.0)
import { AutoEnvParse } from 'auto-envparse';
AutoEnvParse.parse(config, 'DB');
```

#### 2. Simplified Exports - Only One Class
All function exports (`parseEnv`, `parse`, `createFrom`) have been removed. Only the class is exported.

```typescript
// Before (v1.x) - Multiple ways to import
import parseEnv from 'auto-envparse';           // ❌ Removed
import { parse } from 'auto-envparse';          // ❌ Removed
import { createFrom } from 'auto-envparse';     // ❌ Removed
import { AutoEnv } from 'auto-envparse';        // ❌ Renamed

// After (v2.0) - One clear way
import { AutoEnvParse } from 'auto-envparse';   // ✅ Named export
// or
import AEP from 'auto-envparse';                // ✅ Default export (alias)
```

#### 3. Unified `parse()` Method
The `parse()` method now handles both plain objects and class constructors using TypeScript overloads. The `createFrom()` method is replaced by the unified `parse()`.

```typescript
// Before (v1.x) - Two separate methods
AutoEnv.parse(config, 'DB');              // For objects
const instance = createFrom(DbClass, 'DB'); // For classes

// After (v2.0) - One unified method
AutoEnvParse.parse(config, 'DB');              // For objects
const instance = AutoEnvParse.parse(DbClass, 'DB'); // For classes
```

#### 4. `parse()` Now Returns the Parsed Object
The `parse()` method now returns the populated object/instance instead of void.

```typescript
// Before (v1.x) - Returns void
const config = { host: 'localhost' };
AutoEnv.parse(config, 'DB');
console.log(config.host);

// After (v2.0) - Returns the object
const config = AutoEnvParse.parse({ host: 'localhost' }, 'DB');
console.log(config.host);
```

### Migration Guide (v1.x → v2.0)

**Step 1: Update imports**
```typescript
// Replace this:
import parseEnv, { parse, createFrom, AutoEnv } from 'auto-envparse';

// With this:
import { AutoEnvParse } from 'auto-envparse';
// or
import AEP from 'auto-envparse';  // For shorter alias
```

**Step 2: Update parse calls**
```typescript
// Before
parseEnv(config, 'DB');
parse(config, 'DB');
AutoEnv.parse(config, 'DB');

// After
AutoEnvParse.parse(config, 'DB');
// or
AEP.parse(config, 'DB');  // With alias
```

**Step 3: Replace createFrom() with parse()**
```typescript
// Before
import { createFrom } from 'auto-envparse';
class DbConfig { host = 'localhost'; port = 5432; }
const config = createFrom(DbConfig, 'DB');

// After
import { AutoEnvParse } from 'auto-envparse';
class DbConfig { host = 'localhost'; port = 5432; }
const config = AutoEnvParse.parse(DbConfig, 'DB');
```

**Step 4: Optionally use return value**
```typescript
// Before (mutates in place)
const config = { host: 'localhost' };
AutoEnv.parse(config, 'DB');

// After (returns the object)
const config = AutoEnvParse.parse({ host: 'localhost' }, 'DB');
```

### Added
- **Unified `parse()` method** with TypeScript overloads for both objects and class constructors
- **Return value for `parse()`** - Now returns the populated object/instance for better ergonomics
- **Default export** - Class can be imported as default for convenience
- **Emoji in description** - Added ⚡ to package description

### Changed
- **Class name**: `AutoEnv` → `AutoEnvParse`
- **API surface**: Reduced from 5 exports to 1 class (available as both named and default export)
- **Method behavior**: `parse()` now returns the parsed object instead of void

### Removed
- **`parseEnv()` function** - Use `AutoEnvParse.parse()` instead
- **`parse()` function alias** - Use `AutoEnvParse.parse()` instead
- **`createFrom()` function** - Use `AutoEnvParse.parse()` with class constructor instead

### Benefits of v2.0
- ✅ **Simpler API** - One class, two main methods (`parse`, `enumValidator`)
- ✅ **Better discoverability** - Type `AutoEnvParse.` to see all available methods
- ✅ **One way to do it** - No confusion about which import/function to use
- ✅ **Better TypeScript support** - Overloads provide excellent type inference
- ✅ **Clearer naming** - Class name matches package name
- ✅ **More ergonomic** - Return values enable cleaner code patterns

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

[3.0.0]: https://github.com/vlavrynovych/auto-envparse/compare/v2.1.1...v3.0.0
[2.1.1]: https://github.com/vlavrynovych/auto-envparse/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/vlavrynovych/auto-envparse/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/vlavrynovych/auto-envparse/compare/v1.1.1...v2.0.0
[1.1.1]: https://github.com/vlavrynovych/auto-envparse/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/vlavrynovych/auto-envparse/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/vlavrynovych/auto-envparse/releases/tag/v1.0.0
