/**
 * Options for parsing environment variables.
 */
export interface ParseOptions<T = unknown> {
    /**
     * Environment variable prefix (e.g., 'DB', 'APP', 'REDIS').
     * If not specified, uses unprefixed variable names.
     */
    prefix?: string;

    /**
     * Custom override functions for specific properties.
     * Map keys are property names, values are custom parser functions.
     */
    overrides?: Map<string, (target: T, envVarName: string) => void>;

    /**
     * Sources to load environment variables from, in priority order.
     * First source has highest priority.
     *
     * Special keyword: 'env' means process.env
     * Other strings are treated as file paths to load.
     *
     * @default ['env', '.env']
     *
     * @example
     * ```typescript
     * // Use only process.env (v2.0 behavior)
     * sources: ['env']
     *
     * // Multiple files with priority
     * sources: ['env', '.env.local', '.env']
     *
     * // Environment-specific
     * sources: ['env', `.env.${process.env.NODE_ENV}`, '.env']
     * ```
     */
    sources?: Array<'env' | string>;

    /**
     * Custom parser function for .env files.
     * Receives file content as string, returns key-value pairs.
     *
     * If not provided, uses built-in lightweight parser that supports:
     * - KEY=value format
     * - Comments (# comment)
     * - Basic quotes ("value" or 'value')
     * - Empty lines
     *
     * For advanced features (multiline, variable expansion), provide dotenv.parse:
     * ```typescript
     * import * as dotenv from 'dotenv';
     * parse(config, { envFileParser: dotenv.parse })
     * ```
     *
     * @param content - File content as string
     * @returns Parsed key-value pairs
     */
    envFileParser?: (content: string) => Record<string, string>;
}

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
 * - .env file loading with configurable sources
 *
 * @example
 * ```typescript
 * // Simple usage with prefix
 * const config = { host: 'localhost', port: 5432, ssl: false };
 * AutoEnvParse.parse(config, { prefix: 'DB' });
 * // Applies: DB_HOST, DB_PORT, DB_SSL
 *
 * // With .env files
 * AutoEnvParse.parse(config, {
 *   prefix: 'DB',
 *   sources: ['env', '.env.local', '.env']
 * });
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
 * AutoEnvParse.parse(config, { prefix: 'DB', overrides });
 * ```
 */
export class AutoEnvParse {
    /**
     * Parse environment variables and create an instance from a class constructor.
     *
     * @param classConstructor - Class constructor function with default values
     * @param options - Parse options including prefix, overrides, sources, and envFileParser
     * @returns New instance of the class populated from environment variables
     *
     * @example
     * ```typescript
     * class DbConfig { host = 'localhost'; port = 5432; }
     * const config = AutoEnvParse.parse(DbConfig, {
     *   prefix: 'DB',
     *   sources: ['env', '.env.local', '.env']
     * });
     * ```
     */
    static parse<T extends { new(): object }>(
        classConstructor: T,
        options?: ParseOptions<InstanceType<T>>
    ): InstanceType<T>;

    /**
     * Parse environment variables and apply them to a plain object.
     *
     * @param target - Object to populate from environment variables
     * @param options - Parse options including prefix, overrides, sources, and envFileParser
     * @returns The populated object
     *
     * @example
     * ```typescript
     * const config = AutoEnvParse.parse({ host: 'localhost', port: 5432 }, {
     *   prefix: 'DB',
     *   sources: ['env', '.env']
     * });
     * ```
     */
    static parse<T extends object>(
        target: T,
        options?: ParseOptions<T>
    ): T;

    /**
     * Unified parse implementation that handles both objects and class constructors.
     *
     * @param targetOrClass - Either a plain object or a class constructor
     * @param options - Parse options including prefix, overrides, sources, and envFileParser
     * @returns The populated object or class instance
     */
    static parse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        targetOrClass: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options?: ParseOptions<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any {
        // Use provided options or default to empty object
        const opts = options || {};

        // Default sources if not specified
        if (!opts.sources) {
            opts.sources = ['env', '.env'];
        }

        // Load and merge environment variables from all sources
        // sources is guaranteed to be defined by the logic above
        const mergedEnv = this.loadSources(opts.sources!, opts.envFileParser);

        // Runtime detection: is it a constructor function or a plain object?
        if (typeof targetOrClass === 'function') {
            // Class constructor path - create instance and parse it
            const instance = new targetOrClass();
            this.parseObject(instance, opts.prefix || '', opts.overrides, mergedEnv);
            return instance;
        } else {
            // Plain object path - parse and return it
            this.parseObject(targetOrClass, opts.prefix || '', opts.overrides, mergedEnv);
            return targetOrClass;
        }
    }

    /**
     * Parse environment variables and apply them to the target object.
     * This is an internal method that performs the actual parsing logic.
     *
     * @param target - Object to populate from environment variables
     * @param prefix - Optional environment variable prefix (e.g., 'DB', 'APP', 'REDIS'). Defaults to empty string.
     * @param overrides - Optional custom parsers for specific properties
     * @param envSource - Source of environment variables (defaults to process.env)
     */
    private static parseObject<T extends object>(
        target: T,
        prefix: string = '',
        overrides?: Map<string, (target: T, envVarName: string) => void>,
        envSource: Record<string, string> = process.env as Record<string, string>
    ): void {
        // Validate prefix format if provided
        if (prefix && !/^[A-Z0-9]+$/.test(prefix)) {
            throw new Error(`Invalid prefix "${prefix}". Use uppercase letters and numbers only.`);
        }

        for (const key in target) {
            if (!Object.prototype.hasOwnProperty.call(target, key)) {
                continue;
            }

            // Calculate env var name once
            const envVarName = this.buildEnvVarName(prefix, key);

            // Check if there's a custom override for this property
            if (overrides?.has(key)) {
                overrides.get(key)!(target, envVarName);
                continue;
            }

            const value = target[key];

            // Handle different types
            if (value === null || value === undefined) {
                // For null/undefined, try to load as string if env var exists
                this.applyPrimitive(target, key, envVarName, envSource);
            } else if (Array.isArray(value)) {
                this.applyArray(target, key, envVarName, envSource);
            } else if (this.isPlainObject(value)) {
                // Plain object - use nested parsing
                this.applyNestedObject(target, key, envVarName, envSource);
            } else if (typeof value === 'object') {
                // Complex object (class instance)
                this.applyComplexObject(key, envVarName, value, envSource);
            } else {
                // Primitives (string, number, boolean)
                this.applyPrimitive(target, key, envVarName, envSource);
            }
        }
    }

    /**
     * Check if a value is a plain object (not an array, class instance, or null).
     * Works across realms (iframes, vm contexts, etc.)
     *
     * @param value - Value to check
     * @returns True if value is a plain object
     */
    private static isPlainObject(value: unknown): boolean {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const proto = Object.getPrototypeOf(value);
        return proto === null || proto === Object.prototype;
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
     * const config = AutoEnvParse.createFrom(DatabaseConfig, 'DB');
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
     * const config = AutoEnvParse.createFrom(AppConfig); // No prefix
     * ```
     */
    static createFrom<T extends { new(): object }>(
        classConstructor: T,
        prefix?: string,
        overrides?: Map<string, (target: InstanceType<T>, envVarName: string) => void>
    ): InstanceType<T> {
        const instance = new classConstructor() as InstanceType<T>;
        this.parseObject(instance, prefix, overrides);
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
     * @param envSource - Source of environment variables
     */
    private static applyPrimitive<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string,
        envSource: Record<string, string>
    ): void {
        const envValue = envSource[envVarName];
        if (envValue !== undefined) {
            const currentValue = target[key];
            const valueType = currentValue === null || currentValue === undefined
                ? 'string'
                : typeof currentValue;
            target[key] = this.coerceValue(envValue, valueType) as T[K];
        }
    }

    /**
     * Scan environment variables for array indices.
     * Returns sorted array of indices found in env vars matching pattern: {envVarName}_{index}_*
     *
     * @param envVarName - Base environment variable name (e.g., 'APP_SERVERS')
     * @param envSource - Source of environment variables
     * @returns Sorted array of indices (e.g., [0, 1, 3] for sparse array)
     */
    private static detectArrayIndices(envVarName: string, envSource: Record<string, string>): number[] {
        const indices = new Set<number>();
        const pattern = new RegExp(`^${envVarName}_(\\d+)_`, 'i');

        for (const key in envSource) {
            const match = key.match(pattern);
            if (match) {
                indices.add(parseInt(match[1], 10));
            }
        }

        // Return sorted indices for compact array (handles sparse arrays)
        return Array.from(indices).sort((a, b) => a - b);
    }

    /**
     * Parse array element from environment variables using dot-notation.
     * Recursively applies parsing to nested objects within array elements.
     *
     * @param envVarName - Base environment variable name for this array element
     * @param template - Template object to clone and populate
     * @param envSource - Source of environment variables
     * @returns Parsed array element
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static parseArrayElement(envVarName: string, template: any, envSource: Record<string, string>): any {
        // Clone template to avoid mutating original
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let element: any;

        if (typeof template === 'object' && template !== null && !Array.isArray(template)) {
            // Object element - clone and recursively parse
            element = JSON.parse(JSON.stringify(template));

            // Use recursive helper to parse all nested properties
            this.parseObjectPropertiesRecursive(element, envVarName, template, envSource);
        } else {
            // Primitive or array - keep template value
            element = template;
        }

        return element;
    }

    /**
     * Recursively parse object properties from environment variables.
     * Helper method used by parseArrayElement for deep nesting support.
     *
     * @param target - Target object to populate
     * @param envVarName - Base environment variable name
     * @param template - Template object for type inference
     * @param envSource - Source of environment variables
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static parseObjectPropertiesRecursive(target: any, envVarName: string, template: any, envSource: Record<string, string>): void {
        for (const key in target) {
            if (!Object.prototype.hasOwnProperty.call(target, key)) {
                continue;
            }

            const templateValue = template[key];
            const snakeKey = this.toSnakeCase(key).toUpperCase();
            const propertyEnvVarName = `${envVarName}_${snakeKey}`;
            const propertyEnvValue = envSource[propertyEnvVarName];

            if (typeof templateValue === 'object' && templateValue !== null && !Array.isArray(templateValue)) {
                // Nested object - recurse
                this.parseObjectPropertiesRecursive(target[key], propertyEnvVarName, templateValue, envSource);
            } else if (propertyEnvValue !== undefined && propertyEnvValue !== '') {
                // Primitive value - apply coercion
                target[key] = this.coerceValue(propertyEnvValue, typeof templateValue);
            }
        }
    }

    /**
     * Apply array value from environment variable.
     *
     * Supports both dot-notation and JSON formats. Dot-notation takes priority.
     * For dot-notation: APP_SERVERS_0_HOST=value, APP_SERVERS_1_HOST=value
     * For JSON: APP_SERVERS='[{"host":"value"}]'
     *
     * Handles special cases like RegExp arrays (JSON only).
     * Note: RegExp detection only checks if ALL elements in the default array are RegExp instances.
     *
     * @param target - Target object
     * @param key - Property key
     * @param envVarName - Environment variable name
     * @param envSource - Source of environment variables
     */
    private static applyArray<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string,
        envSource: Record<string, string>
    ): void {
        const currentArray = target[key];
        if (!Array.isArray(currentArray) || currentArray.length === 0) {
            // Empty array - skip (no template to infer from)
            return;
        }

        // Check if this is a RegExp array (only support JSON for RegExp)
        const isRegExpArray = currentArray.every(item => item instanceof RegExp);

        // Try dot-notation first (unless RegExp array)
        if (!isRegExpArray) {
            const indices = this.detectArrayIndices(envVarName, envSource);
            if (indices.length > 0) {
                // Dot-notation found - parse array elements
                const template = currentArray[0];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newArray: any[] = [];

                for (const index of indices) {
                    const elementEnvVarName = `${envVarName}_${index}`;
                    const element = this.parseArrayElement(elementEnvVarName, template, envSource);
                    newArray.push(element);
                }

                target[key] = newArray as T[K];
                return;
            }
        }

        // Fall back to JSON parsing (existing behavior)
        const envValue = envSource[envVarName];
        if (envValue) {
            try {
                const parsed = JSON.parse(envValue);
                if (Array.isArray(parsed)) {
                    // Handle special cases (like RegExp arrays)
                    if (isRegExpArray) {
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
     * @param envSource - Source of environment variables
     */
    private static applyNestedObject<T extends object, K extends keyof T>(
        target: T,
        key: K,
        envVarName: string,
        envSource: Record<string, string>
    ): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = target[key] as any;

        // Defensive check - should never happen if called correctly from parse()
        if (!this.isPlainObject(value)) {
            throw new Error(
                `Internal error: applyNestedObject called with non-plain-object for key '${String(key)}'. ` +
                `Expected plain object, got ${value === null ? 'null' : typeof value}`
            );
        }

        // Try JSON first
        const envValue = envSource[envVarName];
        if (envValue) {
            try {
                const parsed = JSON.parse(envValue);
                // Validate parsed value is an object before mutating
                if (typeof parsed === 'object' && parsed !== null) {
                    Object.assign(value, parsed);
                }
            } catch {
                console.warn(`Warning: Invalid ${envVarName} JSON. Using dot-notation if available.`);
            }
        }
        // Then apply dot-notation (takes precedence)
        target[key] = this.loadNestedFromEnv(envVarName, value, envSource) as T[K];
    }

    /**
     * Apply complex object from environment variable.
     *
     * Handles objects like class instances with their own structure.
     * Tries JSON parsing first, then recursively applies dot-notation for nested properties.
     * Supports nested class instances and plain objects.
     *
     * @param key - Property key (used for error messages)
     * @param envVarName - Environment variable name
     * @param value - Current property value
     * @param envSource - Source of environment variables
     */
    private static applyComplexObject<K extends PropertyKey>(
        key: K,
        envVarName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        envSource: Record<string, string>
    ): void {
        // Defensive check - should never happen if called correctly from parse()
        if (typeof value !== 'object' || value === null) {
            throw new Error(
                `Internal error: applyComplexObject called with non-object for key '${String(key)}'. ` +
                `Expected object, got ${value === null ? 'null' : typeof value}`
            );
        }

        // Try JSON first
        const envValue = envSource[envVarName];
        if (envValue) {
            try {
                const parsed = JSON.parse(envValue);
                // Validate parsed value is an object before mutating
                if (typeof parsed === 'object' && parsed !== null) {
                    Object.assign(value, parsed);
                }
            } catch {
                console.warn(`Warning: Invalid ${envVarName} JSON. Using dot-notation if available.`);
            }
        }

        // Recursively apply dot-notation for nested properties
        for (const nestedKey in value) {
            if (!Object.prototype.hasOwnProperty.call(value, nestedKey)) {
                continue;
            }
            const nestedProp = value[nestedKey];
            const snakeNestedKey = this.toSnakeCase(nestedKey).toUpperCase();
            const nestedEnvKey = envVarName ? `${envVarName}_${snakeNestedKey}` : snakeNestedKey;
            const nestedEnvValue = envSource[nestedEnvKey];

            // Handle nested objects recursively
            if (typeof nestedProp === 'object' && nestedProp !== null && !Array.isArray(nestedProp)) {
                this.applyComplexObject(nestedKey, nestedEnvKey, nestedProp, envSource);
            } else if (nestedEnvValue !== undefined && nestedEnvValue !== '') {
                // Handle primitives - empty string means "no value set", keep default
                const nestedType = typeof nestedProp;
                value[nestedKey] = this.coerceValue(nestedEnvValue, nestedType);
            }
        }
    }

    /**
     * Load a nested object from dot-notation environment variables.
     *
     * Looks for environment variables with the pattern: PREFIX_KEY=value or KEY=value (if no prefix)
     * Automatically coerces types based on default value types.
     *
     * Note: Empty string environment variables are treated as "not set" and the default value is kept.
     *       This allows distinguishing between "unset" and "set to empty".
     *
     * @param prefix - Optional prefix for environment variables (e.g., 'APP_LOGGING'). Defaults to empty string.
     * @param defaultValue - Default object structure with types (will be deep cloned)
     * @param envSource - Source of environment variables (defaults to process.env)
     * @returns New object built from env vars or default value
     *
     * @example
     * ```typescript
     * // With prefix - Environment: APP_LOGGING_ENABLED=true, APP_LOGGING_MAX_FILES=20
     * const config = AutoEnvParse.loadNestedFromEnv('APP_LOGGING', {
     *     enabled: false,
     *     path: './logs',
     *     maxFiles: 10
     * });
     * // Result: { enabled: true, path: './logs', maxFiles: 20 }
     *
     * // Without prefix - Environment: ENABLED=true, MAX_FILES=20
     * const config = AutoEnvParse.loadNestedFromEnv('', {
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
        defaultValue: T,
        envSource: Record<string, string> = process.env as Record<string, string>
    ): T {
        // Deep clone to avoid mutation of the original default value
        const result = JSON.parse(JSON.stringify(defaultValue));

        for (const key in defaultValue) {
            if (!Object.prototype.hasOwnProperty.call(defaultValue, key)) {
                continue;
            }

            const value = defaultValue[key];
            // Convert camelCase to SNAKE_CASE for env var name
            const envKey = this.buildEnvVarName(prefix, key);
            const envValue = envSource[envKey];

            // Check if this property is a plain nested object
            if (this.isPlainObject(value)) {
                // Recursively process nested plain objects
                result[key] = this.loadNestedFromEnv(envKey, value, envSource) as T[Extract<keyof T, string>];
            } else if (envValue !== undefined && envValue !== '') {
                // Empty string means "no value set", keep default
                const defaultType = typeof value;
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
     * Falsy values: 'false', '0', 'no', 'off' (case-insensitive)
     * Everything else defaults to false, with optional warning in strict mode.
     *
     * @param value - String value
     * @param strict - If true, warns on unrecognized values (default: false)
     * @returns Boolean value
     *
     * @example
     * ```typescript
     * AutoEnvParse.parseBoolean('true');   // true
     * AutoEnvParse.parseBoolean('yes');    // true
     * AutoEnvParse.parseBoolean('false');  // false
     * AutoEnvParse.parseBoolean('no');     // false
     * AutoEnvParse.parseBoolean('maybe');  // false (no warning by default)
     * AutoEnvParse.parseBoolean('maybe', true);  // false (warns about unrecognized value)
     * ```
     */
    static parseBoolean(value: string, strict = false): boolean {
        const normalized = value.toLowerCase().trim();
        const truthy = ['true', '1', 'yes', 'on'];
        const falsy = ['false', '0', 'no', 'off'];

        if (truthy.includes(normalized)) {
            return true;
        }
        if (falsy.includes(normalized)) {
            return false;
        }

        // Unrecognized value
        if (strict) {
            console.warn(`Warning: Unrecognized boolean value "${value}". Treating as false. ` +
                `Expected: ${[...truthy, ...falsy].join(', ')}`);
        }
        return false;
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
     * Handles consecutive capital letters properly (e.g., 'HTTPSPort' → 'https_port')
     *
     * @param str - camelCase string
     * @returns snake_case string
     *
     * @example
     * ```typescript
     * AutoEnvParse.toSnakeCase('poolSize');      // 'pool_size'
     * AutoEnvParse.toSnakeCase('maxRetries');    // 'max_retries'
     * AutoEnvParse.toSnakeCase('host');          // 'host'
     * AutoEnvParse.toSnakeCase('APIKey');        // 'api_key'
     * AutoEnvParse.toSnakeCase('HTTPSPort');     // 'https_port'
     * ```
     */
    static toSnakeCase(str: string): string {
        return str
            // Handle consecutive capitals: 'XMLParser' → 'XML_Parser'
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            // Handle normal camelCase: 'camelCase' → 'camel_Case'
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            // Convert to lowercase
            .toLowerCase();
    }

    /**
     * Create an enum validator for use with overrides.
     *
     * Returns a validator function that checks if the environment variable value
     * is one of the allowed enum values. Throws an error if invalid.
     *
     * @param propertyKey - The property key to validate (must match the key in overrides Map)
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
     * // Valid: APP_ENVIRONMENT=production
     * // Invalid: APP_ENVIRONMENT=test (throws error)
     * ```
     *
     * @example
     * ```typescript
     * // Case-insensitive matching
     * overrides.set('logLevel', enumValidator('logLevel', ['DEBUG', 'INFO', 'WARN', 'ERROR'], { caseSensitive: false }));
     * // Accepts: debug, DEBUG, Debug, etc.
     * ```
     */
    static enumValidator<T extends object>(
        propertyKey: string,
        allowedValues: string[],
        options: { caseSensitive?: boolean } = {}
    ): (target: T, envVarName: string) => void {
        const { caseSensitive = true } = options;

        return (target: T, envVarName: string) => {
            const value = process.env[envVarName];

            if (!value) {
                // No value provided, keep default
                return;
            }

            const checkValue = caseSensitive ? value : value.toLowerCase();
            const allowed = caseSensitive
                ? allowedValues
                : allowedValues.map(v => v.toLowerCase());

            if (allowed.includes(checkValue)) {
                // Valid enum value - find original case from allowedValues
                const matchIndex = allowed.indexOf(checkValue);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (target as any)[propertyKey] = allowedValues[matchIndex];
            } else {
                throw new Error(
                    `Invalid value for ${envVarName}: "${value}". ` +
                    `Must be one of: ${allowedValues.join(', ')}`
                );
            }
        };
    }

    /**
     * Create a transform function for use with overrides.
     *
     * Returns a function that applies a custom transformation to environment variable values.
     * The transform function receives the raw string value from the environment variable
     * and returns the transformed value of any type.
     *
     * @param propertyKey - The property key to transform (must match the key in overrides Map)
     * @param fn - Transform function that takes a string and returns the transformed value
     * @returns Override function for use with parse()
     *
     * @example
     * ```typescript
     * import { AutoEnvParse } from 'auto-envparse';
     *
     * const config = {
     *     timeout: 30000,
     *     tags: [] as string[]
     * };
     *
     * const overrides = new Map([
     *     // Ensure minimum timeout value
     *     ['timeout', AutoEnvParse.transform('timeout', (val) =>
     *         Math.max(parseInt(val), 1000)
     *     )],
     *
     *     // Split comma-separated values
     *     ['tags', AutoEnvParse.transform('tags', (val) =>
     *         val.split(',').map(t => t.trim())
     *     )],
     * ]);
     *
     * AutoEnvParse.parse(config, 'APP', overrides);
     * ```
     *
     * @example
     * ```typescript
     * // Using lodash for complex transformations
     * import _ from 'lodash';
     *
     * const overrides = new Map([
     *     ['retries', AutoEnvParse.transform('retries', (val) =>
     *         _.clamp(parseInt(val), 1, 10)
     *     )],
     * ]);
     * ```
     */
    static transform<T extends object>(
        propertyKey: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fn: (value: string) => any
    ): (target: T, envVarName: string) => void {
        return (target: T, envVarName: string) => {
            const value = process.env[envVarName];

            if (value !== undefined) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (target as any)[propertyKey] = fn(value);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.warn(`Warning: Transform failed for ${envVarName}: ${errorMsg}`);
                }
            }
        };
    }

    /**
     * Built-in lightweight .env file parser.
     * Supports: KEY=value, comments (#), basic quotes, empty lines.
     * Does NOT support: multiline values, variable expansion, command substitution.
     *
     * @param content - File content as string
     * @returns Parsed key-value pairs
     */
    private static parseEnvFile(content: string): Record<string, string> {
        const result: Record<string, string> = {};
        const lines = content.split('\n');

        for (const line of lines) {
            // Skip empty lines and comments
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Find first = sign
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) {
                continue; // Skip invalid lines
            }

            const key = trimmed.substring(0, eqIndex).trim();
            let value = trimmed.substring(eqIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }

            result[key] = value;
        }

        return result;
    }

    /**
     * Load and merge environment variables from multiple sources.
     * Sources are applied in reverse order (first source has highest priority).
     *
     * @param sources - Array of sources ('env' or file paths)
     * @param envFileParser - Optional custom parser for .env files
     * @returns Merged environment variables
     */
    private static loadSources(
        sources: Array<'env' | string>,
        envFileParser?: (content: string) => Record<string, string>
    ): Record<string, string> {
        // Use provided parser or built-in parser
        const parser = envFileParser || this.parseEnvFile.bind(this);

        // Start with empty environment
        const merged: Record<string, string> = {};

        // Apply sources in REVERSE order (so first source wins)
        for (let i = sources.length - 1; i >= 0; i--) {
            const source = sources[i];

            if (source === 'env') {
                // Load from process.env
                Object.assign(merged, process.env);
            } else {
                // Load from file
                try {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const fs = require('fs');
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const path = require('path');

                    // Resolve file path relative to cwd
                    const filePath = path.resolve(process.cwd(), source);

                    // Check if file exists
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const parsed = parser(content);
                        Object.assign(merged, parsed);
                    } else {
                        // Warn about missing file
                        console.warn(`Warning: Environment file not found: ${source}`);
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.warn(`Warning: Failed to load environment file ${source}: ${errorMsg}`);
                }
            }
        }

        return merged;
    }
}
