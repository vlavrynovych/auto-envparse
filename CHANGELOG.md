# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-09

### Added
- Optional prefix parameter for `autoEnv()`, `parse()`, `AutoEnv.parse()`, and `AutoEnv.loadNestedFromEnv()`
- Support for parsing environment variables without a prefix (e.g., `HOST`, `PORT` instead of `APP_HOST`, `APP_PORT`)
- New `buildEnvVarName()` helper method for conditional prefix handling
- 10 additional tests for optional prefix functionality
- Complete test coverage (46 tests total, 100% coverage)

### Changed
- `prefix` parameter is now optional in all parsing methods (defaults to empty string)
- Updated documentation with examples for both prefixed and non-prefixed usage

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
