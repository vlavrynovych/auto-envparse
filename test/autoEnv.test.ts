import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

        it('should throw error for invalid prefix format', () => {
            const config = { host: 'localhost' };

            // Lowercase prefix should throw
            expect(() => {
                AutoEnv.parse(config, 'db');
            }).toThrow(/Invalid prefix "db"/);

            // Prefix with special characters should throw
            expect(() => {
                AutoEnv.parse(config, 'DB_');
            }).toThrow(/Invalid prefix "DB_"/);

            // Mixed case should throw
            expect(() => {
                AutoEnv.parse(config, 'Db');
            }).toThrow(/Invalid prefix "Db"/);
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

        it('should support deeply nested objects (4 levels)', () => {
            const config = {
                a1: {
                    b1: {
                        c1: {
                            d1: 'test',
                            d2: false
                        }
                    },
                    b2: false
                },
                a2: true
            };

            // Set environment variables at different nesting levels
            process.env.TEST_A1_B1_C1_D1 = 'production';
            process.env.TEST_A1_B1_C1_D2 = 'true';
            process.env.TEST_A1_B2 = 'true';
            process.env.TEST_A2 = 'false';

            AutoEnv.parse(config, 'TEST');

            // Verify all levels are correctly parsed
            expect(config.a1.b1.c1.d1).toBe('production');
            expect(config.a1.b1.c1.d2).toBe(true);
            expect(config.a1.b2).toBe(true);
            expect(config.a2).toBe(false);
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

        it('should handle nested class instances recursively', () => {
            class InnerConfig {
                value = 'default';
                count = 10;
            }

            class OuterConfig {
                inner = new InnerConfig();
                name = 'outer';
            }

            const config = new OuterConfig();

            process.env.TEST_INNER_VALUE = 'updated';
            process.env.TEST_INNER_COUNT = '20';
            process.env.TEST_NAME = 'modified';

            AutoEnv.parse(config, 'TEST');

            expect(config.inner.value).toBe('updated');
            expect(config.inner.count).toBe(20);
            expect(config.name).toBe('modified');
        });

        it('should ignore non-object JSON for complex objects', () => {
            class ComplexConfig {
                value = 100;
            }

            const config = {
                complex: new ComplexConfig()
            };

            // Provide JSON that parses to a non-object
            process.env.TEST_COMPLEX = '"just a string"';
            process.env.TEST_COMPLEX_VALUE = '200';

            AutoEnv.parse(config, 'TEST');

            // Should ignore the non-object JSON and use dot-notation
            expect(config.complex.value).toBe(200);
        });

        it('should ignore non-object JSON for nested plain objects', () => {
            const config = {
                nested: {
                    value: 100,
                    name: 'default'
                }
            };

            // Provide JSON that parses to a primitive (number)
            process.env.TEST_NESTED = '42';
            process.env.TEST_NESTED_VALUE = '200';

            AutoEnv.parse(config, 'TEST');

            // Should ignore the non-object JSON and use dot-notation
            expect(config.nested.value).toBe(200);
            expect(config.nested.name).toBe('default');
        });

        it('should ignore null JSON for nested plain objects', () => {
            const config = {
                nested: {
                    value: 100
                }
            };

            // Provide JSON that parses to null
            process.env.TEST_NESTED = 'null';
            process.env.TEST_NESTED_VALUE = '300';

            AutoEnv.parse(config, 'TEST');

            // Should ignore the null JSON and use dot-notation
            expect(config.nested.value).toBe(300);
        });

        it('should apply valid JSON to nested plain objects', () => {
            const config = {
                nested: {
                    value: 100,
                    name: 'default'
                }
            };

            // Provide valid JSON object
            process.env.TEST_NESTED = '{"value": 500, "name": "from-json"}';

            AutoEnv.parse(config, 'TEST');

            // Should apply JSON values
            expect(config.nested.value).toBe(500);
            expect(config.nested.name).toBe('from-json');
        });

        it('should apply valid JSON to complex objects', () => {
            class ComplexConfig {
                value = 100;
                count = 5;
            }

            const config = {
                complex: new ComplexConfig()
            };

            // Provide valid JSON object
            process.env.TEST_COMPLEX = '{"value": 999, "count": 42}';

            AutoEnv.parse(config, 'TEST');

            // Should apply JSON values
            expect(config.complex.value).toBe(999);
            expect(config.complex.count).toBe(42);
        });

        it('should handle deeply nested class instances (3 levels)', () => {
            class Level3 {
                value = 'deep';
            }

            class Level2 {
                nested = new Level3();
                count = 5;
            }

            class Level1 {
                inner = new Level2();
                name = 'root';
            }

            const config = new Level1();

            process.env.TEST_INNER_NESTED_VALUE = 'very-deep';
            process.env.TEST_INNER_COUNT = '10';
            process.env.TEST_NAME = 'updated-root';

            AutoEnv.parse(config, 'TEST');

            expect(config.inner.nested.value).toBe('very-deep');
            expect(config.inner.count).toBe(10);
            expect(config.name).toBe('updated-root');
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

    describe('createFrom() - Class-based instantiation', () => {
        it('should create and populate instance from class with prefix', () => {
            class DatabaseConfig {
                host: string = 'localhost';
                port: number = 5432;
                ssl: boolean = false;
            }

            process.env.DB_HOST = 'prod.example.com';
            process.env.DB_PORT = '5433';
            process.env.DB_SSL = 'true';

            const config = AutoEnv.createFrom(DatabaseConfig, 'DB');

            expect(config).toBeInstanceOf(DatabaseConfig);
            expect(config.host).toBe('prod.example.com');
            expect(config.port).toBe(5433);
            expect(config.ssl).toBe(true);

            // Cleanup
            delete process.env.DB_HOST;
            delete process.env.DB_PORT;
            delete process.env.DB_SSL;
        });

        it('should create and populate instance from class without prefix', () => {
            class AppConfig {
                nodeEnv: string = 'development';
                port: number = 3000;
                debug: boolean = false;
            }

            process.env.NODE_ENV = 'production';
            process.env.PORT = '8080';
            process.env.DEBUG = 'true';

            const config = AutoEnv.createFrom(AppConfig);

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.nodeEnv).toBe('production');
            expect(config.port).toBe(8080);
            expect(config.debug).toBe(true);

            // Cleanup
            delete process.env.NODE_ENV;
            delete process.env.PORT;
            delete process.env.DEBUG;
        });

        it('should create instance with nested objects', () => {
            class ServerConfig {
                host: string = '0.0.0.0';
                port: number = 3000;
                database = {
                    host: 'localhost',
                    port: 5432
                };
            }

            process.env.SERVER_HOST = '127.0.0.1';
            process.env.SERVER_PORT = '4000';
            process.env.SERVER_DATABASE_HOST = 'db.example.com';
            process.env.SERVER_DATABASE_PORT = '5433';

            const config = AutoEnv.createFrom(ServerConfig, 'SERVER');

            expect(config).toBeInstanceOf(ServerConfig);
            expect(config.host).toBe('127.0.0.1');
            expect(config.port).toBe(4000);
            expect(config.database.host).toBe('db.example.com');
            expect(config.database.port).toBe(5433);

            // Cleanup
            delete process.env.SERVER_HOST;
            delete process.env.SERVER_PORT;
            delete process.env.SERVER_DATABASE_HOST;
            delete process.env.SERVER_DATABASE_PORT;
        });

        it('should support custom overrides', () => {
            class ApiConfig {
                port: number = 3000;
                environment: string = 'development';
            }

            const overrides = new Map();
            overrides.set('port', (obj: ApiConfig, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const port = parseInt(value, 10);
                    if (port >= 1 && port <= 65535) {
                        obj.port = port;
                    } else {
                        throw new Error(`Invalid port: ${port}`);
                    }
                }
            });

            process.env.API_PORT = '8443';
            process.env.API_ENVIRONMENT = 'production';

            const config = AutoEnv.createFrom(ApiConfig, 'API', overrides);

            expect(config).toBeInstanceOf(ApiConfig);
            expect(config.port).toBe(8443);
            expect(config.environment).toBe('production');

            // Cleanup
            delete process.env.API_PORT;
            delete process.env.API_ENVIRONMENT;
        });

        it('should preserve default values when env vars not set', () => {
            class DefaultConfig {
                timeout: number = 5000;
                retries: number = 3;
                enabled: boolean = true;
            }

            // Only set one env var
            process.env.TEST_TIMEOUT = '10000';

            const config = AutoEnv.createFrom(DefaultConfig, 'TEST');

            expect(config).toBeInstanceOf(DefaultConfig);
            expect(config.timeout).toBe(10000); // From env
            expect(config.retries).toBe(3);     // Default preserved
            expect(config.enabled).toBe(true);  // Default preserved

            // Cleanup
            delete process.env.TEST_TIMEOUT;
        });

        it('should work with classes having methods', () => {
            class ConfigWithMethods {
                host: string = 'localhost';
                port: number = 5432;

                getConnectionString(): string {
                    return `${this.host}:${this.port}`;
                }
            }

            process.env.APP_HOST = 'example.com';
            process.env.APP_PORT = '3306';

            const config = AutoEnv.createFrom(ConfigWithMethods, 'APP');

            expect(config).toBeInstanceOf(ConfigWithMethods);
            expect(config.host).toBe('example.com');
            expect(config.port).toBe(3306);
            expect(config.getConnectionString()).toBe('example.com:3306');

            // Cleanup
            delete process.env.APP_HOST;
            delete process.env.APP_PORT;
        });

        describe('Defensive checks', () => {
            it('should throw error when applyNestedObject receives null', () => {
                // This test verifies the defensive check in applyNestedObject
                // We need to trick the parse() method's type check by modifying after creation
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const config: any = {
                    nested: { value: 'test' }
                };

                // Replace with null after parse starts checking
                config.nested = null;

                // Manually call the private method through parse
                // Since parse checks types, we need to test via reflection
                expect(() => {
                    // @ts-expect-error - accessing private method for testing
                    AutoEnv.applyNestedObject(config, 'nested', 'TEST_NESTED');
                }).toThrow(/Internal error: applyNestedObject called with non-plain-object/);
            });

            it('should throw error when applyNestedObject receives non-object', () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const config: any = { nested: 'not-an-object' };

                expect(() => {
                    // @ts-expect-error - accessing private method for testing
                    AutoEnv.applyNestedObject(config, 'nested', 'TEST_NESTED');
                }).toThrow(/Internal error: applyNestedObject called with non-plain-object/);
            });

            it('should throw error when applyComplexObject receives null', () => {
                expect(() => {
                    // @ts-expect-error - accessing private method for testing
                    AutoEnv.applyComplexObject('complex', 'TEST_COMPLEX', null);
                }).toThrow(/Internal error: applyComplexObject called with non-object/);
            });

            it('should throw error when applyComplexObject receives primitive', () => {
                expect(() => {
                    // @ts-expect-error - accessing private method for testing
                    AutoEnv.applyComplexObject('complex', 'TEST_COMPLEX', 'string');
                }).toThrow(/Internal error: applyComplexObject called with non-object/);
            });
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
                expect(AutoEnv.parseBoolean('FALSE')).toBe(false);
                expect(AutoEnv.parseBoolean('0')).toBe(false);
                expect(AutoEnv.parseBoolean('no')).toBe(false);
                expect(AutoEnv.parseBoolean('NO')).toBe(false);
                expect(AutoEnv.parseBoolean('off')).toBe(false);
                expect(AutoEnv.parseBoolean('OFF')).toBe(false);
            });

            it('should treat unrecognized values as false', () => {
                expect(AutoEnv.parseBoolean('random')).toBe(false);
                expect(AutoEnv.parseBoolean('maybe')).toBe(false);
                expect(AutoEnv.parseBoolean('')).toBe(false);
            });

            it('should warn on unrecognized values in strict mode', () => {
                const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                expect(AutoEnv.parseBoolean('maybe', true)).toBe(false);
                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Unrecognized boolean value "maybe"')
                );

                warnSpy.mockRestore();
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

            it('should handle consecutive capitals correctly', () => {
                expect(AutoEnv.toSnakeCase('APIKey')).toBe('api_key');
                expect(AutoEnv.toSnakeCase('HTTPSPort')).toBe('https_port');
                expect(AutoEnv.toSnakeCase('XMLParser')).toBe('xml_parser');
                expect(AutoEnv.toSnakeCase('URLPath')).toBe('url_path');
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

        it('should deep clone defaults to avoid mutation', () => {
            const defaults = {
                database: {
                    host: 'localhost',
                    port: 5432
                }
            };

            process.env.TEST_DATABASE_HOST = 'example.com';

            const result1 = AutoEnv.loadNestedFromEnv('TEST', defaults);
            const result2 = AutoEnv.loadNestedFromEnv('TEST', defaults);

            // Verify results are independent
            expect(result1.database.host).toBe('example.com');
            expect(result2.database.host).toBe('example.com');

            // Verify original is unmodified
            expect(defaults.database.host).toBe('localhost');

            // Verify results don't share references
            result1.database.port = 9999;
            expect(result2.database.port).toBe(5432);
        });

        it('should skip inherited properties', () => {
            // Create an object with inherited properties
            const proto = { inherited: 'from-proto' };
            const defaults = Object.create(proto) as { inherited?: string; own: string };
            defaults.own = 'default';

            process.env.TEST_OWN = 'updated';
            process.env.TEST_INHERITED = 'should-not-apply';

            const result = AutoEnv.loadNestedFromEnv('TEST', defaults);

            // Only own property should be updated
            expect(result.own).toBe('updated');
            // Inherited property should not be in result
            expect(Object.prototype.hasOwnProperty.call(result, 'inherited')).toBe(false);
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
