/**
 * auto-envparse - Automatic environment variable parsing with zero configuration
 *
 * @packageDocumentation
 */

import { AutoEnv } from './autoEnv';

/**
 * Parse environment variables and apply them to the target object.
 *
 * This is the main entry point for auto-envparse. Uses reflection to discover
 * properties and automatically applies environment variables based on
 * naming convention and type coercion.
 *
 * @param target - Object to populate from environment variables
 * @param prefix - Optional environment variable prefix (e.g., 'DB', 'APP', 'REDIS'). Defaults to empty string.
 * @param overrides - Optional custom parsers for specific properties
 *
 * @example
 * ```typescript
 * import parseEnv from 'auto-envparse';
 *
 * const config = {
 *     host: 'localhost',
 *     port: 5432,
 *     ssl: false
 * };
 *
 * // With prefix - Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
 * parseEnv(config, 'DB');
 * // config is now: { host: 'example.com', port: 3306, ssl: true }
 *
 * // Without prefix - Environment: HOST=example.com, PORT=3306, SSL=true
 * parseEnv(config);
 * // config is now: { host: 'example.com', port: 3306, ssl: true }
 * ```
 */
export default function parseEnv<T extends object>(
    target: T,
    prefix?: string,
    overrides?: Map<string, (target: T, envVarName: string) => void>
): void {
    AutoEnv.parse(target, prefix, overrides);
}

// Named exports
export { AutoEnv };

/**
 * Alias for parseEnv. Use whichever name you prefer.
 * Parse environment variables and apply them to the target object.
 */
export const parse = parseEnv;

/**
 * Create and populate an instance from a class constructor.
 *
 * @param classConstructor - Class constructor function with default values
 * @param prefix - Optional environment variable prefix
 * @param overrides - Optional custom parsers for specific properties
 * @returns New instance of the class populated from environment variables
 *
 * @example
 * ```typescript
 * import { createFrom } from 'auto-envparse';
 *
 * class DatabaseConfig {
 *     host = 'localhost';
 *     port = 5432;
 *     ssl = false;
 * }
 *
 * const config = createFrom(DatabaseConfig, 'DB');
 * ```
 */
export const createFrom = AutoEnv.createFrom.bind(AutoEnv);

/**
 * Create an enum validator for use with overrides.
 *
 * Provides a convenient way to validate that environment variable values
 * match one of the allowed enum values. Throws an error if invalid.
 *
 * @param propertyKey - The property key to validate
 * @param allowedValues - Array of valid enum values
 * @param options - Optional configuration
 * @returns Override function for use with parse()
 *
 * @example
 * ```typescript
 * import parseEnv, { enumValidator } from 'auto-envparse';
 *
 * type Environment = 'development' | 'staging' | 'production';
 *
 * const config = {
 *     environment: 'development' as Environment
 * };
 *
 * const overrides = new Map();
 * overrides.set('environment', enumValidator('environment', ['development', 'staging', 'production']));
 *
 * parseEnv(config, 'APP', overrides);
 * ```
 */
export const enumValidator = AutoEnv.enumValidator.bind(AutoEnv);

// Utility functions removed from named exports.
// Advanced users can access them via AutoEnv.* methods:
// - AutoEnv.parseBoolean()
// - AutoEnv.parseNumber()
// - AutoEnv.toSnakeCase()
// - AutoEnv.coerceValue()
// - AutoEnv.loadNestedFromEnv()
// - AutoEnv.enumValidator()
