import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AEP, { AutoEnvParse } from '../src/index';

/**
 * Tests for src/index.ts to ensure all exports are accessible
 * and work correctly with the new v2.0 API.
 */
describe('Index Exports - v2.0 API', () => {
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

    describe('Named export', () => {
        it('should export AutoEnvParse as named export', () => {
            expect(AutoEnvParse).toBeDefined();
            expect(typeof AutoEnvParse).toBe('function');
            expect(typeof AutoEnvParse.parse).toBe('function');
            expect(typeof AutoEnvParse.enumValidator).toBe('function');
        });

        it('should parse plain objects with named export', () => {
            const config = {
                host: 'localhost',
                port: 5432
            };

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result).toBe(config); // Returns the same object
            expect(result.host).toBe('example.com');
            expect(result.port).toBe(3306);
        });

        it('should parse class instances with named export', () => {
            class TestConfig {
                host = 'localhost';
                port = 5432;
            }

            process.env.TEST_HOST = 'created.example.com';
            process.env.TEST_PORT = '5434';

            const config = AutoEnvParse.parse(TestConfig, { prefix: 'TEST' });

            expect(config).toBeInstanceOf(TestConfig);
            expect(config.host).toBe('created.example.com');
            expect(config.port).toBe(5434);
        });
    });

    describe('Default export', () => {
        it('should export AutoEnvParse as default export', () => {
            expect(AEP).toBeDefined();
            expect(typeof AEP).toBe('function');
            expect(AEP).toBe(AutoEnvParse); // Same reference
        });

        it('should parse plain objects with default export', () => {
            const config = {
                host: 'localhost',
                port: 5432
            };

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '3306';

            const result = AEP.parse(config, { prefix: 'TEST' });

            expect(result).toBe(config);
            expect(result.host).toBe('example.com');
            expect(result.port).toBe(3306);
        });

        it('should parse class instances with default export', () => {
            class DatabaseConfig {
                host = 'localhost';
                port = 5432;
            }

            process.env.TEST_HOST = 'db.example.com';
            process.env.TEST_PORT = '5433';

            const config = AEP.parse(DatabaseConfig, { prefix: 'TEST' });

            expect(config).toBeInstanceOf(DatabaseConfig);
            expect(config.host).toBe('db.example.com');
            expect(config.port).toBe(5433);
        });
    });

    describe('Unified parse() method', () => {
        it('should handle object parsing and return the object', () => {
            const config = {
                host: 'localhost',
                port: 5432,
                ssl: false
            };

            process.env.TEST_HOST = 'unified.example.com';
            process.env.TEST_PORT = '3307';
            process.env.TEST_SSL = 'true';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result).toBe(config); // Same reference
            expect(result.host).toBe('unified.example.com');
            expect(result.port).toBe(3307);
            expect(result.ssl).toBe(true);
        });

        it('should handle class parsing and return new instance', () => {
            class ServerConfig {
                host = '0.0.0.0';
                port = 3000;
                debug = false;

                getUrl(): string {
                    return `http://${this.host}:${this.port}`;
                }
            }

            process.env.TEST_HOST = 'server.example.com';
            process.env.TEST_PORT = '8080';
            process.env.TEST_DEBUG = 'true';

            const config = AutoEnvParse.parse(ServerConfig, { prefix: 'TEST' });

            expect(config).toBeInstanceOf(ServerConfig);
            expect(config.host).toBe('server.example.com');
            expect(config.port).toBe(8080);
            expect(config.debug).toBe(true);
            expect(config.getUrl()).toBe('http://server.example.com:8080');
        });

        it('should work without prefix for objects', () => {
            const config = {
                host: 'localhost',
                port: 3000,
                debug: false
            };

            process.env.HOST = 'no-prefix.example.com';
            process.env.PORT = '8080';
            process.env.DEBUG = 'true';

            const result = AutoEnvParse.parse(config);

            expect(result.host).toBe('no-prefix.example.com');
            expect(result.port).toBe(8080);
            expect(result.debug).toBe(true);

            // Cleanup
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.DEBUG;
        });

        it('should work without prefix for classes', () => {
            class AppConfig {
                port = 3000;
                debug = false;
            }

            process.env.PORT = '9000';
            process.env.DEBUG = 'true';

            const config = AutoEnvParse.parse(AppConfig);

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.port).toBe(9000);
            expect(config.debug).toBe(true);

            // Cleanup
            delete process.env.PORT;
            delete process.env.DEBUG;
        });
    });

    describe('Utility methods via class', () => {
        it('should access utility methods via AutoEnvParse', () => {
            expect(typeof AutoEnvParse.parseBoolean).toBe('function');
            expect(typeof AutoEnvParse.parseNumber).toBe('function');
            expect(typeof AutoEnvParse.toSnakeCase).toBe('function');
            expect(typeof AutoEnvParse.coerceValue).toBe('function');
            expect(typeof AutoEnvParse.loadNestedFromEnv).toBe('function');
            expect(typeof AutoEnvParse.enumValidator).toBe('function');
            expect(typeof AutoEnvParse.transform).toBe('function');

            // Verify they work
            expect(AutoEnvParse.parseBoolean('true')).toBe(true);
            expect(AutoEnvParse.parseNumber('42')).toBe(42);
            expect(AutoEnvParse.toSnakeCase('poolSize')).toBe('pool_size');
            expect(AutoEnvParse.coerceValue('true', 'boolean')).toBe(true);
        });

        it('should use enumValidator with parse()', () => {
            const config = {
                environment: 'development'
            };

            const overrides = new Map();
            overrides.set('environment',
                AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production'])
            );

            process.env.TEST_ENVIRONMENT = 'production';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(result.environment).toBe('production');
        });

        it('should use transform with parse()', () => {
            const config = {
                timeout: 30000,
                tags: [] as string[]
            };

            const overrides = new Map([
                ['timeout', AutoEnvParse.transform('timeout', (val) => Math.max(parseInt(val), 1000))],
                ['tags', AutoEnvParse.transform('tags', (val) => val.split(',').map(t => t.trim()))]
            ]);

            process.env.TEST_TIMEOUT = '500';
            process.env.TEST_TAGS = 'tag1, tag2, tag3';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(result.timeout).toBe(1000);
            expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should use parseNumber in custom override with parse()', () => {
            const config = {
                retries: 3
            };

            const overrides = new Map();
            overrides.set('retries', (obj: typeof config, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const num = AutoEnvParse.parseNumber(value);
                    if (!isNaN(num) && num > 0) {
                        obj.retries = num;
                    }
                }
            });

            process.env.TEST_RETRIES = '10';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(result.retries).toBe(10);
        });
    });

    describe('Edge cases with new API', () => {
        it('should handle array properties when env var is not set', () => {
            const config = {
                tags: ['default1', 'default2'],
                values: [1, 2, 3]
            };

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result.tags).toEqual(['default1', 'default2']);
            expect(result.values).toEqual([1, 2, 3]);
        });

        it('should handle null value as string from env var', () => {
            const config: { nested: string | null } = {
                nested: null
            };

            process.env.TEST_NESTED = 'value-from-env';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result.nested).toBe('value-from-env');

            delete process.env.TEST_NESTED;
        });

        it('should handle nested plain objects', () => {
            const config = {
                server: {
                    host: 'localhost',
                    port: 3000
                },
                cache: {
                    enabled: false
                }
            };

            process.env.TEST_SERVER_HOST = 'nested.example.com';
            process.env.TEST_SERVER_PORT = '4000';
            process.env.TEST_CACHE_ENABLED = 'true';

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result.server.host).toBe('nested.example.com');
            expect(result.server.port).toBe(4000);
            expect(result.cache.enabled).toBe(true);
        });

        it('should handle class with nested properties', () => {
            class ComplexConfig {
                database = {
                    host: 'localhost',
                    port: 5432
                };
            }

            process.env.TEST_DATABASE_HOST = 'prod.example.com';
            process.env.TEST_DATABASE_PORT = '5433';

            const config = AutoEnvParse.parse(ComplexConfig, { prefix: 'TEST' });

            expect(config).toBeInstanceOf(ComplexConfig);
            expect(config.database.host).toBe('prod.example.com');
            expect(config.database.port).toBe(5433);
        });
    });
});
