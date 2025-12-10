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

        it('should work without prefix using default export', () => {
            const config = {
                host: 'localhost',
                port: 3000,
                debug: false
            };

            process.env.HOST = 'no-prefix.example.com';
            process.env.PORT = '8080';
            process.env.DEBUG = 'true';

            parseEnv(config); // No prefix

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

        it('should work with createFrom without prefix', () => {
            class AppConfig {
                port = 3000;
                debug = false;
            }

            process.env.PORT = '9000';
            process.env.DEBUG = 'true';

            const config = createFrom(AppConfig);

            expect(config.port).toBe(9000);
            expect(config.debug).toBe(true);

            // Cleanup
            delete process.env.PORT;
            delete process.env.DEBUG;
        });
    });

    describe('Edge case coverage', () => {
        it('should handle array properties when env var is not set', () => {
            const config = {
                tags: ['default1', 'default2'],
                values: [1, 2, 3]
            };

            // Don't set any env vars - arrays should remain unchanged
            parseEnv(config, 'TEST');

            expect(config.tags).toEqual(['default1', 'default2']);
            expect(config.values).toEqual([1, 2, 3]);
        });

        it('should handle null value as string from env var', () => {
            const config: { nested: string | null } = {
                nested: null
            };

            process.env.TEST_NESTED = 'value-from-env';

            parseEnv(config, 'TEST');

            // null/undefined are treated as strings
            expect(config.nested).toBe('value-from-env');

            // Cleanup
            delete process.env.TEST_NESTED;
        });

        it('should handle complex object with recursive dot-notation', () => {
            class ComplexConfig {
                database = {
                    host: 'localhost',
                    port: 5432
                };
            }

            const config = new ComplexConfig();

            process.env.TEST_DATABASE_HOST = 'prod.example.com';
            process.env.TEST_DATABASE_PORT = '5433';

            parseEnv(config, 'TEST');

            expect(config.database.host).toBe('prod.example.com');
            expect(config.database.port).toBe(5433);

            // Cleanup
            delete process.env.TEST_DATABASE_HOST;
            delete process.env.TEST_DATABASE_PORT;
        });

        it('should handle plain nested objects without env vars', () => {
            const config = {
                server: {
                    host: 'localhost',
                    port: 3000
                },
                cache: {
                    enabled: false
                }
            };

            // No env vars set - should keep defaults
            parseEnv(config, 'APP');

            expect(config.server.host).toBe('localhost');
            expect(config.server.port).toBe(3000);
            expect(config.cache.enabled).toBe(false);
        });
    });
});
