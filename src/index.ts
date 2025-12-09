/**
 * auto-envparse - Automatic environment variable parsing with zero configuration
 *
 * @packageDocumentation
 */

import { AutoEnv } from './autoEnv';

/**
 * Automatically parse environment variables and apply them to the target object.
 *
 * This is the main entry point for auto-envparse. Uses reflection to discover
 * properties and automatically applies environment variables based on
 * naming convention and type coercion.
 *
 * @param target - Object to populate from environment variables
 * @param prefix - Environment variable prefix (e.g., 'DB', 'APP', 'REDIS')
 * @param overrides - Optional custom parsers for specific properties
 *
 * @example
 * ```typescript
 * import autoEnv from 'auto-envparse';
 *
 * const config = {
 *     host: 'localhost',
 *     port: 5432,
 *     ssl: false
 * };
 *
 * // Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
 * autoEnv(config, 'DB');
 * // config is now: { host: 'example.com', port: 3306, ssl: true }
 * ```
 */
export default function autoEnv<T extends object>(
    target: T,
    prefix: string,
    overrides?: Map<string, (target: T, envVarName: string) => void>
): void {
    AutoEnv.parse(target, prefix, overrides);
}

// Named exports
export { AutoEnv };

/**
 * Alias for the default autoEnv function.
 * Parse environment variables and apply them to the target object.
 */
export const parse = autoEnv;

export const parseBoolean = AutoEnv.parseBoolean.bind(AutoEnv);
export const parseNumber = AutoEnv.parseNumber.bind(AutoEnv);
export const toSnakeCase = AutoEnv.toSnakeCase.bind(AutoEnv);
export const coerceValue = AutoEnv.coerceValue.bind(AutoEnv);
export const loadNestedFromEnv = AutoEnv.loadNestedFromEnv.bind(AutoEnv);
