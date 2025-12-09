import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import autoEnv, { parse, AutoEnv, parseBoolean, parseNumber, toSnakeCase, coerceValue, loadNestedFromEnv } from '../src/index';

/**
 * Tests for src/index.ts to ensure all exports are accessible
 * and the main autoEnv function works correctly.
 */
describe('Index Exports', () => {
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

    describe('Default export', () => {
        it('should export autoEnv as default function', () => {
            expect(autoEnv).toBeDefined();
            expect(typeof autoEnv).toBe('function');
        });

        it('should work with default export', () => {
            const config = {
                host: 'localhost',
                port: 5432
            };

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';

            autoEnv(config, 'TEST');

            expect(config.host).toBe('example.com');
            expect(config.port).toBe(3306);
        });
    });

    describe('Named exports', () => {
        it('should export parse as alias to autoEnv', () => {
            expect(parse).toBeDefined();
            expect(typeof parse).toBe('function');
            expect(parse).toBe(autoEnv);
        });

        it('should export AutoEnv class', () => {
            expect(AutoEnv).toBeDefined();
            expect(typeof AutoEnv).toBe('function');
            expect(typeof AutoEnv.parse).toBe('function');
        });

        it('should export parseBoolean', () => {
            expect(parseBoolean).toBeDefined();
            expect(typeof parseBoolean).toBe('function');
            expect(parseBoolean('true')).toBe(true);
            expect(parseBoolean('false')).toBe(false);
        });

        it('should export parseNumber', () => {
            expect(parseNumber).toBeDefined();
            expect(typeof parseNumber).toBe('function');
            expect(parseNumber('42')).toBe(42);
            expect(parseNumber('3.14')).toBe(3.14);
        });

        it('should export toSnakeCase', () => {
            expect(toSnakeCase).toBeDefined();
            expect(typeof toSnakeCase).toBe('function');
            expect(toSnakeCase('poolSize')).toBe('pool_size');
        });

        it('should export coerceValue', () => {
            expect(coerceValue).toBeDefined();
            expect(typeof coerceValue).toBe('function');
            expect(coerceValue('true', 'boolean')).toBe(true);
            expect(coerceValue('42', 'number')).toBe(42);
            expect(coerceValue('hello', 'string')).toBe('hello');
        });

        it('should export loadNestedFromEnv', () => {
            expect(loadNestedFromEnv).toBeDefined();
            expect(typeof loadNestedFromEnv).toBe('function');

            process.env.TEST_CONFIG_ENABLED = 'true';
            process.env.TEST_CONFIG_MAX_FILES = '20';

            const result = loadNestedFromEnv('TEST_CONFIG', {
                enabled: false,
                path: './logs',
                maxFiles: 10
            });

            expect(result).toEqual({
                enabled: true,
                path: './logs',
                maxFiles: 20
            });
        });
    });

    describe('Integration', () => {
        it('should work with both default and named exports together', () => {
            const config = {
                host: 'localhost',
                port: 5432,
                retries: 3
            };

            const overrides = new Map();
            overrides.set('retries', (obj: typeof config, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const num = parseNumber(value); // Using named export utility
                    if (!isNaN(num) && num > 0) {
                        obj.retries = num;
                    }
                }
            });

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';
            process.env.TEST_RETRIES = '5';

            autoEnv(config, 'TEST', overrides); // Using default export

            expect(config.host).toBe('example.com');
            expect(config.port).toBe(3306);
            expect(config.retries).toBe(5);
        });

        it('should work with parse alias', () => {
            const config = {
                host: 'localhost',
                port: 5432
            };

            process.env.TEST_HOST = 'db.example.com';
            process.env.TEST_PORT = '5433';

            parse(config, 'TEST'); // Using parse alias

            expect(config.host).toBe('db.example.com');
            expect(config.port).toBe(5433);
        });

        it('should work without prefix using default export', () => {
            const config = {
                host: 'localhost',
                port: 3000,
                debug: false
            };

            process.env.HOST = 'no-prefix.example.com';
            process.env.PORT = '8080';
            process.env.DEBUG = 'true';

            autoEnv(config); // No prefix

            expect(config.host).toBe('no-prefix.example.com');
            expect(config.port).toBe(8080);
            expect(config.debug).toBe(true);

            // Cleanup
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.DEBUG;
        });

        it('should work without prefix using parse alias', () => {
            const config = {
                maxRetries: 3,
                timeout: 5000
            };

            process.env.MAX_RETRIES = '10';
            process.env.TIMEOUT = '30000';

            parse(config); // No prefix

            expect(config.maxRetries).toBe(10);
            expect(config.timeout).toBe(30000);

            // Cleanup
            delete process.env.MAX_RETRIES;
            delete process.env.TIMEOUT;
        });
    });
});
