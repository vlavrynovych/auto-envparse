import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests for utility methods (parseBoolean, parseNumber, toSnakeCase, coerceValue, loadNestedFromEnv).
 * These are static helper methods that can be used independently.
 */
describe('AutoEnvParse - Utility Methods', () => {
    // Store original env vars to restore after tests
    const originalEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
        // Save current env vars
        Object.keys(process.env)
            .filter(key => key.startsWith('TEST_'))
            .forEach(key => {
                originalEnv[key] = process.env[key];
                delete process.env[key];
            });
    });

    afterEach(() => {
        // Restore original env vars
        Object.keys(process.env)
            .filter(key => key.startsWith('TEST_'))
            .forEach(key => delete process.env[key]);

        Object.keys(originalEnv).forEach(key => {
            if (originalEnv[key] !== undefined) {
                process.env[key] = originalEnv[key];
            }
        });
    });

    describe('parseBoolean()', () => {
        it('should parse truthy values', () => {
            expect(AutoEnvParse.parseBoolean('true')).toBe(true);
            expect(AutoEnvParse.parseBoolean('TRUE')).toBe(true);
            expect(AutoEnvParse.parseBoolean('1')).toBe(true);
            expect(AutoEnvParse.parseBoolean('yes')).toBe(true);
            expect(AutoEnvParse.parseBoolean('YES')).toBe(true);
            expect(AutoEnvParse.parseBoolean('on')).toBe(true);
            expect(AutoEnvParse.parseBoolean('ON')).toBe(true);
        });

        it('should parse falsy values', () => {
            expect(AutoEnvParse.parseBoolean('false')).toBe(false);
            expect(AutoEnvParse.parseBoolean('FALSE')).toBe(false);
            expect(AutoEnvParse.parseBoolean('0')).toBe(false);
            expect(AutoEnvParse.parseBoolean('no')).toBe(false);
            expect(AutoEnvParse.parseBoolean('NO')).toBe(false);
            expect(AutoEnvParse.parseBoolean('off')).toBe(false);
            expect(AutoEnvParse.parseBoolean('OFF')).toBe(false);
        });

        it('should default unrecognized values to false', () => {
            expect(AutoEnvParse.parseBoolean('maybe')).toBe(false);
            expect(AutoEnvParse.parseBoolean('unknown')).toBe(false);
            expect(AutoEnvParse.parseBoolean('')).toBe(false);
        });
    });

    describe('parseNumber()', () => {
        it('should parse valid numbers', () => {
            expect(AutoEnvParse.parseNumber('42')).toBe(42);
            expect(AutoEnvParse.parseNumber('3.14')).toBe(3.14);
            expect(AutoEnvParse.parseNumber('-10')).toBe(-10);
            expect(AutoEnvParse.parseNumber('0')).toBe(0);
        });

        it('should return NaN for invalid numbers', () => {
            expect(AutoEnvParse.parseNumber('not-a-number')).toBeNaN();
            expect(AutoEnvParse.parseNumber('')).toBeNaN();
        });
    });

    describe('toSnakeCase()', () => {
        it('should convert camelCase to snake_case', () => {
            expect(AutoEnvParse.toSnakeCase('poolSize')).toBe('pool_size');
            expect(AutoEnvParse.toSnakeCase('maxRetries')).toBe('max_retries');
            expect(AutoEnvParse.toSnakeCase('databaseUrl')).toBe('database_url');
        });

        it('should handle consecutive capitals', () => {
            expect(AutoEnvParse.toSnakeCase('APIKey')).toBe('api_key');
            expect(AutoEnvParse.toSnakeCase('HTTPSPort')).toBe('https_port');
            expect(AutoEnvParse.toSnakeCase('XMLParser')).toBe('xml_parser');
        });

        it('should handle single words', () => {
            expect(AutoEnvParse.toSnakeCase('host')).toBe('host');
            expect(AutoEnvParse.toSnakeCase('port')).toBe('port');
        });
    });

    describe('coerceValue()', () => {
        it('should coerce to boolean', () => {
            expect(AutoEnvParse.coerceValue('true', 'boolean')).toBe(true);
            expect(AutoEnvParse.coerceValue('false', 'boolean')).toBe(false);
            expect(AutoEnvParse.coerceValue('1', 'boolean')).toBe(true);
        });

        it('should coerce to number', () => {
            expect(AutoEnvParse.coerceValue('42', 'number')).toBe(42);
            expect(AutoEnvParse.coerceValue('3.14', 'number')).toBe(3.14);
        });

        it('should coerce to string', () => {
            expect(AutoEnvParse.coerceValue('hello', 'string')).toBe('hello');
            expect(AutoEnvParse.coerceValue('123', 'string')).toBe('123');
        });

        it('should default to string for unknown types', () => {
            expect(AutoEnvParse.coerceValue('value', 'unknown')).toBe('value');
        });
    });

    describe('loadNestedFromEnv()', () => {
        it('should load nested config from env vars with prefix', () => {
            process.env.TEST_LOGGING_ENABLED = 'true';
            process.env.TEST_LOGGING_PATH = '/var/log';
            process.env.TEST_LOGGING_MAX_FILES = '20';

            const result = AutoEnvParse.loadNestedFromEnv('TEST_LOGGING', {
                enabled: false,
                path: './logs',
                maxFiles: 10
            });

            expect(result.enabled).toBe(true);
            expect(result.path).toBe('/var/log');
            expect(result.maxFiles).toBe(20);
        });

        it('should load nested config without prefix', () => {
            process.env.MY_ENABLED = 'true';
            process.env.MY_MAX_FILES = '30';

            const result = AutoEnvParse.loadNestedFromEnv('MY', {
                enabled: false,
                maxFiles: 10
            });

            expect(result.enabled).toBe(true);
            expect(result.maxFiles).toBe(30);
        });

        it('should handle deeply nested objects', () => {
            process.env.TEST_DB_POOL_MIN = '5';
            process.env.TEST_DB_POOL_MAX = '20';

            const result = AutoEnvParse.loadNestedFromEnv('TEST_DB', {
                host: 'localhost',
                pool: {
                    min: 2,
                    max: 10
                }
            });

            expect(result.host).toBe('localhost');
            expect(result.pool.min).toBe(5);
            expect(result.pool.max).toBe(20);
        });

        it('should not mutate original default value', () => {
            const defaultValue = {
                enabled: false,
                maxFiles: 10
            };

            process.env.TEST_ENABLED = 'true';
            process.env.TEST_MAX_FILES = '30';

            const result = AutoEnvParse.loadNestedFromEnv('TEST', defaultValue);

            // Result should be updated
            expect(result.enabled).toBe(true);
            expect(result.maxFiles).toBe(30);

            // Original should be unchanged
            expect(defaultValue.enabled).toBe(false);
            expect(defaultValue.maxFiles).toBe(10);
        });

        it('should treat empty string as "no value"', () => {
            process.env.TEST_VALUE = '';

            const result = AutoEnvParse.loadNestedFromEnv('TEST', {
                value: 'default'
            });

            // Empty string means "not set", keep default
            expect(result.value).toBe('default');
        });

        it('should handle non-plain nested objects', () => {
            class NestedClass {
                value = 'default';
            }

            process.env.TEST_PLAIN_KEY = 'updated-key';

            const result = AutoEnvParse.loadNestedFromEnv('TEST', {
                plain: { key: 'value' },
                complex: new NestedClass()
            });

            // Plain object should work
            expect(result.plain.key).toBe('updated-key');
            // Complex object is cloned via JSON (loses class type)
            expect(result.complex.value).toBe('default');
        });

        it('should not process inherited properties', () => {
            class Base {
                inherited = 'base';
            }

            const child = Object.create(Base.prototype);
            child.own = 'child';

            process.env.TEST_OWN = 'updated-own';
            process.env.TEST_INHERITED = 'updated-inherited';

            const result = AutoEnvParse.loadNestedFromEnv('TEST', child);

            expect(result.own).toBe('updated-own');
            expect(Object.prototype.hasOwnProperty.call(result, 'inherited')).toBe(false);
        });
    });
});
