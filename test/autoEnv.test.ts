import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoEnv } from '../src/autoEnv';

describe('AutoEnv - Standalone Usage', () => {
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

    describe('parse() - Standalone automatic parsing', () => {
        it('should parse environment variables into any object', () => {
            const config = {
                host: 'localhost',
                port: 5432,
                ssl: false,
                poolSize: 10
            };

            process.env.TEST_HOST = 'db.example.com';
            process.env.TEST_PORT = '3306';
            process.env.TEST_SSL = 'true';
            process.env.TEST_POOL_SIZE = '20';

            AutoEnv.parse(config, 'TEST');

            expect(config.host).toBe('db.example.com');
            expect(config.port).toBe(3306);
            expect(config.ssl).toBe(true);
            expect(config.poolSize).toBe(20);
        });

        it('should work with any custom prefix', () => {
            const dbConfig = {
                database: 'mydb',
                timeout: 5000
            };

            process.env.DB_DATABASE = 'production';
            process.env.DB_TIMEOUT = '10000';

            AutoEnv.parse(dbConfig, 'DB');

            expect(dbConfig.database).toBe('production');
            expect(dbConfig.timeout).toBe(10000);
        });

        it('should support nested objects', () => {
            const config = {
                connection: {
                    host: 'localhost',
                    port: 5432
                }
            };

            process.env.TEST_CONNECTION_HOST = 'remote.example.com';
            process.env.TEST_CONNECTION_PORT = '3307';

            AutoEnv.parse(config, 'TEST');

            expect(config.connection.host).toBe('remote.example.com');
            expect(config.connection.port).toBe(3307);
        });

        it('should support custom overrides', () => {
            const config = {
                port: 5432,
                retries: 3
            };

            const overrides = new Map();
            overrides.set('port', (obj: typeof config, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const port = parseInt(value, 10);
                    if (port >= 1 && port <= 65535) {
                        obj.port = port;
                    } else {
                        console.warn(`Invalid port ${port}`);
                    }
                }
            });

            // Valid port
            process.env.TEST_PORT = '8080';
            process.env.TEST_RETRIES = '5';

            AutoEnv.parse(config, 'TEST', overrides);

            expect(config.port).toBe(8080);
            expect(config.retries).toBe(5);

            // Invalid port (out of range) - should keep original
            process.env.TEST_PORT = '99999';
            const config2 = { port: 5432, retries: 3 };
            AutoEnv.parse(config2, 'TEST', overrides);

            expect(config2.port).toBe(5432);
        });

        it('should handle null and undefined values', () => {
            const config = {
                optional: null as string | null,
                unset: undefined as string | undefined,
                value: 'test'
            };

            process.env.TEST_OPTIONAL = 'from-env';
            process.env.TEST_UNSET = 'also-from-env';

            AutoEnv.parse(config, 'TEST');

            expect(config.optional).toBe('from-env');
            expect(config.unset).toBe('also-from-env');
            expect(config.value).toBe('test');
        });

        it('should skip inherited properties from prototype', () => {
            process.env.TEST_INHERITED = 'from-env';
            process.env.TEST_OWN = 'own-value';

            // Create object with prototype property
            const protoObject = { inherited: 'proto-value' };
            const config = Object.create(protoObject) as { inherited: string; own: string };
            config.own = 'default';

            AutoEnv.parse(config, 'TEST');

            // Own property should be updated
            expect(config.own).toBe('own-value');
            // Inherited property should NOT be in result
            expect(Object.prototype.hasOwnProperty.call(config, 'inherited')).toBe(false);
        });

        it('should handle non-RegExp arrays', () => {
            const config = {
                tags: ['default1', 'default2'],
                numbers: [1, 2, 3]
            };

            process.env.TEST_TAGS = '["tag1", "tag2", "tag3"]';
            process.env.TEST_NUMBERS = '[10, 20, 30]';

            AutoEnv.parse(config, 'TEST');

            expect(config.tags).toEqual(['tag1', 'tag2', 'tag3']);
            expect(config.numbers).toEqual([10, 20, 30]);
        });

        it('should handle RegExp arrays', () => {
            const config = {
                patterns: [/default/]
            };

            process.env.TEST_PATTERNS = '["^test", ".*\\\\.js$"]';

            AutoEnv.parse(config, 'TEST');

            expect(config.patterns).toHaveLength(2);
            expect(config.patterns[0]).toBeInstanceOf(RegExp);
            expect(config.patterns[0].source).toBe('^test');
            expect(config.patterns[1]).toBeInstanceOf(RegExp);
            expect(config.patterns[1].source).toBe('.*\\.js$');
        });

        it('should handle invalid array JSON gracefully', () => {
            const config = {
                tags: ['default1', 'default2']
            };

            process.env.TEST_TAGS = 'not-valid-json';

            AutoEnv.parse(config, 'TEST');

            // Should keep default value when JSON is invalid
            expect(config.tags).toEqual(['default1', 'default2']);
        });

        it('should handle nested object with invalid JSON', () => {
            const config = {
                nested: {
                    value: 100
                }
            };

            process.env.TEST_NESTED = 'not-valid-json';
            process.env.TEST_NESTED_VALUE = '200';

            AutoEnv.parse(config, 'TEST');

            // Should fall back to dot-notation
            expect(config.nested.value).toBe(200);
        });

        it('should handle complex object with invalid JSON', () => {
            class ComplexConfig {
                value: number = 100;
            }

            const complexInstance = new ComplexConfig();
            const config = {
                complex: complexInstance
            };

            process.env.TEST_COMPLEX = 'not-valid-json';
            process.env.TEST_COMPLEX_VALUE = '200';

            AutoEnv.parse(config, 'TEST');

            // Should fall back to dot-notation
            expect(config.complex.value).toBe(200);
        });

        it('should handle objects with inherited properties in nested structures', () => {
            // Create nested object with prototype
            const protoObject = { inherited: 'proto' };
            const nested = Object.create(protoObject) as { inherited: string; value: number };
            nested.value = 100;

            const config = {
                nested: nested
            };

            process.env.TEST_NESTED_VALUE = '200';
            process.env.TEST_NESTED_INHERITED = 'should-not-apply';

            AutoEnv.parse(config, 'TEST');

            // Own property should be updated
            expect(config.nested.value).toBe(200);
            // Inherited property should not be modified
            expect(Object.prototype.hasOwnProperty.call(config.nested, 'inherited')).toBe(false);
        });

        it('should skip inherited properties in complex objects', () => {
            // Create a complex object (class instance) with prototype
            class ComplexConfig {
                value: number = 100;
            }
            const protoObject = { inherited: 'proto' };
            Object.setPrototypeOf(ComplexConfig.prototype, protoObject);

            const complexInstance = new ComplexConfig();
            const config = {
                complex: complexInstance
            };

            process.env.TEST_COMPLEX_VALUE = '200';
            process.env.TEST_COMPLEX_INHERITED = 'should-not-apply';

            AutoEnv.parse(config, 'TEST');

            // Own property should be updated
            expect(config.complex.value).toBe(200);
            // Inherited property should not be on instance
            expect(Object.prototype.hasOwnProperty.call(config.complex, 'inherited')).toBe(false);
        });
    });

    describe('Optional prefix support', () => {
        it('should parse environment variables without prefix', () => {
            const config = {
                host: 'localhost',
                port: 5432,
                ssl: false
            };

            process.env.HOST = 'example.com';
            process.env.PORT = '3306';
            process.env.SSL = 'true';

            AutoEnv.parse(config);

            expect(config.host).toBe('example.com');
            expect(config.port).toBe(3306);
            expect(config.ssl).toBe(true);

            // Cleanup
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.SSL;
        });

        it('should parse nested objects without prefix', () => {
            const config = {
                database: {
                    host: 'localhost',
                    port: 5432
                }
            };

            process.env.DATABASE_HOST = 'remote.example.com';
            process.env.DATABASE_PORT = '3307';

            AutoEnv.parse(config);

            expect(config.database.host).toBe('remote.example.com');
            expect(config.database.port).toBe(3307);

            // Cleanup
            delete process.env.DATABASE_HOST;
            delete process.env.DATABASE_PORT;
        });

        it('should support custom overrides without prefix', () => {
            const config = {
                port: 5432,
                environment: 'development'
            };

            const overrides = new Map();
            overrides.set('port', (obj: typeof config, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const port = parseInt(value, 10);
                    if (port >= 1 && port <= 65535) {
                        obj.port = port;
                    }
                }
            });

            process.env.PORT = '8080';
            process.env.ENVIRONMENT = 'production';

            AutoEnv.parse(config, '', overrides);

            expect(config.port).toBe(8080);
            expect(config.environment).toBe('production');

            // Cleanup
            delete process.env.PORT;
            delete process.env.ENVIRONMENT;
        });

        it('should work with loadNestedFromEnv without prefix', () => {
            process.env.ENABLED = 'true';
            process.env.PATH = './custom/path';
            process.env.MAX_FILES = '50';

            const result = AutoEnv.loadNestedFromEnv('', {
                enabled: false,
                path: './default',
                maxFiles: 10
            });

            expect(result).toEqual({
                enabled: true,
                path: './custom/path',
                maxFiles: 50
            });

            // Cleanup
            delete process.env.ENABLED;
            delete process.env.PATH;
            delete process.env.MAX_FILES;
        });

        it('should handle camelCase properties without prefix', () => {
            const config = {
                maxRetries: 3,
                connectionTimeout: 5000,
                apiKey: ''
            };

            process.env.MAX_RETRIES = '10';
            process.env.CONNECTION_TIMEOUT = '30000';
            process.env.API_KEY = 'secret-key-123';

            AutoEnv.parse(config);

            expect(config.maxRetries).toBe(10);
            expect(config.connectionTimeout).toBe(30000);
            expect(config.apiKey).toBe('secret-key-123');

            // Cleanup
            delete process.env.MAX_RETRIES;
            delete process.env.CONNECTION_TIMEOUT;
            delete process.env.API_KEY;
        });

        it('should handle complex objects (class instances) without prefix', () => {
            // Create a class instance (complex object)
            class DatabaseConfig {
                host: string = 'localhost';
                port: number = 5432;
                timeout: number = 5000;
            }

            const dbInstance = new DatabaseConfig();
            const config = {
                database: dbInstance
            };

            // Set env vars without prefix for complex object properties
            process.env.DATABASE_HOST = 'complex-host.example.com';
            process.env.DATABASE_PORT = '3307';
            process.env.DATABASE_TIMEOUT = '10000';

            AutoEnv.parse(config, ''); // Explicit empty prefix

            // Should use dot-notation for complex object
            expect(config.database.host).toBe('complex-host.example.com');
            expect(config.database.port).toBe(3307);
            expect(config.database.timeout).toBe(10000);

            // Cleanup
            delete process.env.DATABASE_HOST;
            delete process.env.DATABASE_PORT;
            delete process.env.DATABASE_TIMEOUT;
        });

        it('should handle complex objects at root level without prefix', () => {
            // Test with class instance directly
            class AppConfig {
                port: number = 3000;
                debug: boolean = false;
            }

            const appInstance = new AppConfig();
            const config = {
                app: appInstance
            };

            // Set env vars without any prefix
            process.env.APP_PORT = '8080';
            process.env.APP_DEBUG = 'true';

            AutoEnv.parse(config, ''); // Empty string prefix

            expect(config.app.port).toBe(8080);
            expect(config.app.debug).toBe(true);

            // Cleanup
            delete process.env.APP_PORT;
            delete process.env.APP_DEBUG;
        });

        it('should handle complex object with empty string property name', () => {
            // Edge case: property with empty string as key
            class NestedConfig {
                value: number = 100;
                name: string = 'default';
            }

            const nestedInstance = new NestedConfig();
            const config: Record<string, NestedConfig> = {
                '': nestedInstance  // Empty string as property name
            };

            // When prefix is empty and key is empty, envVarName becomes empty
            // So nested properties should be accessed directly
            process.env.VALUE = '200';
            process.env.NAME = 'custom';

            AutoEnv.parse(config, ''); // Empty prefix

            expect(config[''].value).toBe(200);
            expect(config[''].name).toBe('custom');

            // Cleanup
            delete process.env.VALUE;
            delete process.env.NAME;
        });
    });

    describe('Type coercion methods', () => {
        describe('parseBoolean()', () => {
            it('should parse truthy values correctly', () => {
                expect(AutoEnv.parseBoolean('true')).toBe(true);
                expect(AutoEnv.parseBoolean('TRUE')).toBe(true);
                expect(AutoEnv.parseBoolean('1')).toBe(true);
                expect(AutoEnv.parseBoolean('yes')).toBe(true);
                expect(AutoEnv.parseBoolean('YES')).toBe(true);
                expect(AutoEnv.parseBoolean('on')).toBe(true);
                expect(AutoEnv.parseBoolean('ON')).toBe(true);
            });

            it('should parse falsy values correctly', () => {
                expect(AutoEnv.parseBoolean('false')).toBe(false);
                expect(AutoEnv.parseBoolean('0')).toBe(false);
                expect(AutoEnv.parseBoolean('no')).toBe(false);
                expect(AutoEnv.parseBoolean('off')).toBe(false);
                expect(AutoEnv.parseBoolean('random')).toBe(false);
            });
        });

        describe('parseNumber()', () => {
            it('should parse valid numbers', () => {
                expect(AutoEnv.parseNumber('42')).toBe(42);
                expect(AutoEnv.parseNumber('3.14')).toBe(3.14);
                expect(AutoEnv.parseNumber('-10')).toBe(-10);
            });

            it('should return NaN for invalid numbers', () => {
                expect(AutoEnv.parseNumber('not-a-number')).toBeNaN();
            });
        });

        describe('toSnakeCase()', () => {
            it('should convert camelCase to snake_case', () => {
                expect(AutoEnv.toSnakeCase('poolSize')).toBe('pool_size');
                expect(AutoEnv.toSnakeCase('maxRetries')).toBe('max_retries');
                expect(AutoEnv.toSnakeCase('connectionTimeout')).toBe('connection_timeout');
                expect(AutoEnv.toSnakeCase('host')).toBe('host');
            });
        });

        describe('coerceValue()', () => {
            it('should coerce to boolean', () => {
                expect(AutoEnv.coerceValue('true', 'boolean')).toBe(true);
                expect(AutoEnv.coerceValue('false', 'boolean')).toBe(false);
            });

            it('should coerce to number', () => {
                expect(AutoEnv.coerceValue('42', 'number')).toBe(42);
                expect(AutoEnv.coerceValue('3.14', 'number')).toBe(3.14);
            });

            it('should return string for string type', () => {
                expect(AutoEnv.coerceValue('hello', 'string')).toBe('hello');
            });
        });
    });

    describe('loadNestedFromEnv()', () => {
        it('should load nested object from dot-notation env vars', () => {
            process.env.TEST_LOGGING_ENABLED = 'true';
            process.env.TEST_LOGGING_PATH = './custom/logs';
            process.env.TEST_LOGGING_MAX_FILES = '25';

            const result = AutoEnv.loadNestedFromEnv('TEST_LOGGING', {
                enabled: false,
                path: './logs',
                maxFiles: 10
            });

            expect(result).toEqual({
                enabled: true,
                path: './custom/logs',
                maxFiles: 25
            });
        });

        it('should preserve defaults for unset env vars', () => {
            process.env.TEST_CONFIG_ENABLED = 'true';

            const result = AutoEnv.loadNestedFromEnv('TEST_CONFIG', {
                enabled: false,
                path: './default',
                maxFiles: 10
            });

            expect(result).toEqual({
                enabled: true,
                path: './default',
                maxFiles: 10
            });
        });
    });

    describe('Real-world usage examples', () => {
        it('should work for database configuration', () => {
            const dbConfig = {
                host: 'localhost',
                port: 5432,
                database: 'mydb',
                user: 'postgres',
                password: '',
                ssl: false,
                pool: {
                    min: 2,
                    max: 10
                }
            };

            process.env.DB_HOST = 'prod-db.example.com';
            process.env.DB_PORT = '5433';
            process.env.DB_DATABASE = 'production';
            process.env.DB_USER = 'app_user';
            process.env.DB_PASSWORD = 'secret123';
            process.env.DB_SSL = 'true';
            process.env.DB_POOL_MIN = '5';
            process.env.DB_POOL_MAX = '50';

            AutoEnv.parse(dbConfig, 'DB');

            expect(dbConfig.host).toBe('prod-db.example.com');
            expect(dbConfig.port).toBe(5433);
            expect(dbConfig.database).toBe('production');
            expect(dbConfig.user).toBe('app_user');
            expect(dbConfig.password).toBe('secret123');
            expect(dbConfig.ssl).toBe(true);
            expect(dbConfig.pool.min).toBe(5);
            expect(dbConfig.pool.max).toBe(50);
        });

        it('should work for application configuration', () => {
            const appConfig = {
                port: 3000,
                host: '0.0.0.0',
                debug: false,
                cors: {
                    enabled: true,
                    origin: '*'
                },
                rateLimit: {
                    windowMs: 900000,
                    max: 100
                }
            };

            process.env.APP_PORT = '8080';
            process.env.APP_DEBUG = 'true';
            process.env.APP_CORS_ORIGIN = 'https://example.com';
            process.env.APP_RATE_LIMIT_MAX = '1000';

            AutoEnv.parse(appConfig, 'APP');

            expect(appConfig.port).toBe(8080);
            expect(appConfig.debug).toBe(true);
            expect(appConfig.cors.origin).toBe('https://example.com');
            expect(appConfig.rateLimit.max).toBe(1000);
        });
    });
});
