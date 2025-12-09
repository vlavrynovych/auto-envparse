import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import parseEnv, { parse, AutoEnv, createFrom } from '../src/index';

/**
 * Tests for src/index.ts to ensure all exports are accessible
 * and the main parseEnv function works correctly.
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
        it('should export parseEnv as default function', () => {
            expect(parseEnv).toBeDefined();
            expect(typeof parseEnv).toBe('function');
        });

        it('should work with default export', () => {
            const config = {
                host: 'localhost',
                port: 5432
            };

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';

            parseEnv(config, 'TEST');

            expect(config.host).toBe('example.com');
            expect(config.port).toBe(3306);
        });
    });

    describe('Named exports', () => {
        it('should export parse as alias to parseEnv', () => {
            expect(parse).toBeDefined();
            expect(typeof parse).toBe('function');
            expect(parse).toBe(parseEnv);
        });

        it('should export AutoEnv class', () => {
            expect(AutoEnv).toBeDefined();
            expect(typeof AutoEnv).toBe('function');
            expect(typeof AutoEnv.parse).toBe('function');
        });

        it('should export createFrom function', () => {
            expect(createFrom).toBeDefined();
            expect(typeof createFrom).toBe('function');
        });

        it('should verify utility functions are accessible via AutoEnv', () => {
            // Utility functions removed from named exports but still accessible via AutoEnv
            expect(typeof AutoEnv.parseBoolean).toBe('function');
            expect(typeof AutoEnv.parseNumber).toBe('function');
            expect(typeof AutoEnv.toSnakeCase).toBe('function');
            expect(typeof AutoEnv.coerceValue).toBe('function');
            expect(typeof AutoEnv.loadNestedFromEnv).toBe('function');

            // Verify they still work
            expect(AutoEnv.parseBoolean('true')).toBe(true);
            expect(AutoEnv.parseNumber('42')).toBe(42);
            expect(AutoEnv.toSnakeCase('poolSize')).toBe('pool_size');
            expect(AutoEnv.coerceValue('true', 'boolean')).toBe(true);
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
                    const num = AutoEnv.parseNumber(value); // Using AutoEnv utility
                    if (!isNaN(num) && num > 0) {
                        obj.retries = num;
                    }
                }
            });

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';
            process.env.TEST_RETRIES = '5';

            parseEnv(config, 'TEST', overrides); // Using default export

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

        it('should work with createFrom', () => {
            class TestConfig {
                host = 'localhost';
                port = 5432;
            }

            process.env.TEST_HOST = 'created.example.com';
            process.env.TEST_PORT = '5434';

            const config = createFrom(TestConfig, 'TEST');

            expect(config.host).toBe('created.example.com');
            expect(config.port).toBe(5434);
        });
    });
});
