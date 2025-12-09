/**
 * Utility class for parsing environment variables and applying them to configuration objects.
 *
 * Provides automatic environment variable discovery and type coercion based on object structure.
 *
 * **Features:**
 * - Automatic type detection (primitives, arrays, objects)
 * - CamelCase to SNAKE_CASE conversion
 * - Type coercion (string, number, boolean)
 * - Nested object support with dot-notation
 * - Override system for custom parsing
 *
 * @example
 * ```typescript
 * // Simple usage
 * const config = { host: 'localhost', port: 5432, ssl: false };
 * AutoEnv.parse(config, 'DB');
 * // Applies: DB_HOST, DB_PORT, DB_SSL
 *
 * // With overrides
 * const overrides = new Map();
 * overrides.set('port', (obj, envVar) => {
 *     const value = process.env[envVar];
 *     if (value) {
 *         const port = parseInt(value, 10);
 *         if (port >= 1 && port <= 65535) {
 *             obj.port = port;
 *         }
 *     }
 * });
 * AutoEnv.parse(config, 'DB', overrides);
 * ```
 */
export class AutoEnv {
    /**
     * Parse environment variables and apply them to the target object.
     *
     * Uses reflection to discover properties and automatically applies environment variables
     * based on naming convention and type coercion.
     *
     * @param target - Object to populate from environment variables
     * @param prefix - Optional environment variable prefix (e.g., 'DB', 'APP', 'REDIS'). Defaults to empty string.
     * @param overrides - Optional custom parsers for specific properties
     *
     * @example
     * ```typescript
     * const config = {
     *     host: 'localhost',
     *     port: 5432,
     *     ssl: false,
     *     poolSize: 10
     * };
     *
     * // With prefix - Environment: DB_HOST=example.com, DB_PORT=3306, DB_SSL=true
     * AutoEnv.parse(config, 'DB');
     * // Result: { host: 'example.com', port: 3306, ssl: true, poolSize: 10 }
     *
     * // Without prefix - Environment: HOST=example.com, PORT=3306, SSL=true
     * AutoEnv.parse(config);
     * // Result: { host: 'example.com', port: 3306, ssl: true, poolSize: 10 }
     * ```
     */
    static parse<T extends object>(
        target: T,
        prefix: string = '',
        overrides?: Map<string, (target: T, envVarName: string) => void>
    ): void {
        for (const key in target) {
            if (!Object.prototype.hasOwnProperty.call(target, key)) {
                continue;
            }

            // Check if there's a custom override for this property
            if (overrides?.has(key)) {
                const envVarName = this.buildEnvVarName(prefix, key);
                overrides.get(key)!(target, envVarName);
                continue;
            }

            const value = target[key];
            const envVarName = this.buildEnvVarName(prefix, key);

            // Handle different types
            if (value === null || value === undefined) {
                // For null/undefined, try to load as string if env var exists
                this.applyPrimitive(target, key, envVarName);
            } else if (Array.isArray(value)) {
                this.applyArray(target, key, envVarName);
            } else if (typeof value === 'object' && value.constructor === Object) {
                // Plain object - use nested parsing
                this.applyNestedObject(target, key, envVarName);
            } else if (typeof value === 'object') {
                // Complex object (class instance)
                this.applyComplexObject(target, key, envVarName, value);
            } else {
                // Primitives (string, number, boolean)
                this.applyPrimitive(target, key, envVarName);
            }
        }
    }

    /**
     * Create and populate an instance from a class constructor.
     *
     * This method instantiates a class and populates it from environment variables.
     * Perfect for when you already have classes with default values defined.
     *
     * @param classConstructor - Class constructor function with default values
     * @param prefix - Optional environment variable prefix. Defaults to empty string.
     * @param overrides - Optional custom parsers for specific properties
     * @returns New instance of the class populated from environment variables
     *
     * @example
     * ```typescript
     * class DatabaseConfig {
     *     host = 'localhost';
     *     port = 5432;
     *     ssl = false;
     * }
     *
     * // Environment: DB_HOST=prod.example.com, DB_PORT=5433, DB_SSL=true
     * const config = AutoEnv.createFrom(DatabaseConfig, 'DB');
     * // config is instance of DatabaseConfig with env values applied
     * ```
     *
     * @example
     * ```typescript
     * class AppConfig {
     *     nodeEnv = 'development';
     *     port = 3000;
     *     debug = false;
     * }
     *
     * // Environment: NODE_ENV=production, PORT=8080, DEBUG=true
     * const config = AutoEnv.createFrom(AppConfig); // No prefix
     * ```
     */
    static createFrom<T extends { new(): object }>(
        classConstructor: T,
        prefix?: string,
        overrides?: Map<string, (target: InstanceType<T>, envVarName: string) => void>
    ): InstanceType<T> {
        const instance = new classConstructor() as InstanceType<T>;
        this.parse(instance, prefix, overrides);
        return instance;
    }

    /**
     * Build environment variable name from prefix and property key.
     *
     * @param prefix - Optional prefix (empty string if not provided)
     * @param key - Property key
     * @returns Environment variable name (e.g., 'DB_HOST' or 'HOST')
     */
    private static buildEnvVarName(prefix: string, key: string): string {
        const snakeKey = this.toSnakeCase(key).toUpperCase();
        return prefix ? `${prefix}_${snakeKey}` : snakeKey;
    }

    /**
     * Apply primitive value from environment variable.
     *
     * Handles string, number, and boolean types with automatic type coercion.
     *
     * @param target - Target object
     * @param key - Property key
     * @param envVarName - Environment variable name
     */
    private static applyPrimitive<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string
    ): void {
        const envValue = process.env[envVarName];
        if (envValue !== undefined) {
            const currentValue = target[key];
            const valueType = currentValue === null || currentValue === undefined
                ? 'string'
                : typeof currentValue;
            target[key] = this.coerceValue(envValue, valueType) as T[K];
        }
    }

    /**
     * Apply array value from environment variable (expects JSON format).
     *
     * Handles special cases like RegExp arrays.
     *
     * @param target - Target object
     * @param key - Property key
     * @param envVarName - Environment variable name
     */
    private static applyArray<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string
    ): void {
        const envValue = process.env[envVarName];
        if (envValue) {
            try {
                const parsed = JSON.parse(envValue);
                if (Array.isArray(parsed)) {
                    // Handle special cases (like RegExp arrays)
                    const currentArray = target[key];
                    if (Array.isArray(currentArray) && currentArray.length > 0 && currentArray[0] instanceof RegExp) {
                        target[key] = parsed.map(p => new RegExp(p)) as T[K];
                    } else {
                        target[key] = parsed as T[K];
                    }
                }
            } catch {
                console.warn(`Warning: Invalid ${envVarName} format. Expected JSON array.`);
            }
        }
    }

    /**
     * Apply nested object from environment variable.
     *
     * Tries JSON parsing first, then falls back to dot-notation env vars.
     * Dot-notation takes precedence over JSON for individual properties.
     *
     * @param target - Target object
     * @param key - Property key
     * @param envVarName - Environment variable name
     */
    private static applyNestedObject<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string
    ): void {
        const value = target[key];
        if (typeof value === 'object' && value !== null) {
            // Try JSON first
            const envValue = process.env[envVarName];
            if (envValue) {
                try {
                    const parsed = JSON.parse(envValue);
                    Object.assign(value, parsed);
                } catch {
                    console.warn(`Warning: Invalid ${envVarName} JSON. Using dot-notation if available.`);
                }
            }
            // Then apply dot-notation (takes precedence)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            target[key] = this.loadNestedFromEnv(envVarName, value as any) as T[K];
        }
    }

    /**
     * Apply complex object from environment variable.
     *
     * Handles objects like class instances with their own structure.
     * Tries JSON parsing first, then recursively applies dot-notation for nested properties.
     *
     * @param target - Target object
     * @param key - Property key
     * @param envVarName - Environment variable name
     * @param value - Current property value
     */
    private static applyComplexObject<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ): void {
        // Try JSON first
        const envValue = process.env[envVarName];
        if (envValue) {
            try {
                const parsed = JSON.parse(envValue);
                Object.assign(value, parsed);
            } catch {
                console.warn(`Warning: Invalid ${envVarName} JSON. Using dot-notation if available.`);
            }
        }

        // Recursively apply dot-notation for nested properties
        if (typeof value === 'object' && value !== null) {
            for (const nestedKey in value) {
                if (!Object.prototype.hasOwnProperty.call(value, nestedKey)) {
                    continue;
                }
                const snakeNestedKey = this.toSnakeCase(nestedKey).toUpperCase();
                const nestedEnvKey = envVarName ? `${envVarName}_${snakeNestedKey}` : snakeNestedKey;
                const nestedValue = process.env[nestedEnvKey];
                if (nestedValue !== undefined && nestedValue !== '') {
                    const nestedType = typeof value[nestedKey];
                    value[nestedKey] = this.coerceValue(nestedValue, nestedType);
                }
            }
        }
    }

    /**
     * Load a nested object from dot-notation environment variables.
     *
     * Looks for environment variables with the pattern: PREFIX_KEY=value or KEY=value (if no prefix)
     * Automatically coerces types based on default value types.
     *
     * @param prefix - Optional prefix for environment variables (e.g., 'APP_LOGGING'). Defaults to empty string.
     * @param defaultValue - Default object structure with types
     * @returns Object built from env vars or default value
     *
     * @example
     * ```typescript
     * // With prefix - Environment: APP_LOGGING_ENABLED=true, APP_LOGGING_MAX_FILES=20
     * const config = AutoEnv.loadNestedFromEnv('APP_LOGGING', {
     *     enabled: false,
     *     path: './logs',
     *     maxFiles: 10
     * });
     * // Result: { enabled: true, path: './logs', maxFiles: 20 }
     *
     * // Without prefix - Environment: ENABLED=true, MAX_FILES=20
     * const config = AutoEnv.loadNestedFromEnv('', {
     *     enabled: false,
     *     path: './logs',
     *     maxFiles: 10
     * });
     * // Result: { enabled: true, path: './logs', maxFiles: 20 }
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static loadNestedFromEnv<T extends Record<string, any>>(
        prefix: string = '',
        defaultValue: T
    ): T {
        const result = { ...defaultValue };

        for (const key in defaultValue) {
            if (!Object.prototype.hasOwnProperty.call(defaultValue, key)) {
                continue;
            }

            // Convert camelCase to SNAKE_CASE for env var name
            const envKey = this.buildEnvVarName(prefix, key);
            const envValue = process.env[envKey];

            if (envValue !== undefined && envValue !== '') {
                const defaultType = typeof defaultValue[key];
                result[key] = this.coerceValue(envValue, defaultType) as T[Extract<keyof T, string>];
            }
        }

        return result;
    }

    /**
     * Coerce a string value to the specified type.
     *
     * @param value - String value from environment variable
     * @param type - Target type ('boolean', 'number', 'string')
     * @returns Coerced value
     */
    static coerceValue(value: string, type: string): string | number | boolean {
        switch (type) {
            case 'boolean':
                return this.parseBoolean(value);
            case 'number':
                return this.parseNumber(value);
            case 'string':
            default:
                return value;
        }
    }

    /**
     * Parse a string to boolean.
     *
     * Truthy values: 'true', '1', 'yes', 'on' (case-insensitive)
     * Everything else is false.
     *
     * @param value - String value
     * @returns Boolean value
     */
    static parseBoolean(value: string): boolean {
        const normalized = value.toLowerCase().trim();
        return ['true', '1', 'yes', 'on'].includes(normalized);
    }

    /**
     * Parse a string to number.
     *
     * @param value - String value
     * @returns Parsed number or NaN if invalid
     */
    static parseNumber(value: string): number {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
            console.warn(`Warning: Invalid number value "${value}", using NaN`);
        }
        return parsed;
    }

    /**
     * Convert camelCase to snake_case.
     *
     * @param str - camelCase string
     * @returns snake_case string
     *
     * @example
     * ```typescript
     * AutoEnv.toSnakeCase('poolSize');     // 'pool_size'
     * AutoEnv.toSnakeCase('maxRetries');   // 'max_retries'
     * AutoEnv.toSnakeCase('host');         // 'host'
     * ```
     */
    static toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
