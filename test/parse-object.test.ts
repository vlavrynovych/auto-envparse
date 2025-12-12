import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests for parsing plain objects with environment variables.
 * Covers basic parsing, type coercion, nested objects, and optional prefix support.
 */
describe('AutoEnvParse - Object Parsing', () => {
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

    describe('parse() - Basic object parsing', () => {
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

            AutoEnvParse.parse(config, 'TEST');

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

            AutoEnvParse.parse(dbConfig, 'DB');

            expect(dbConfig.database).toBe('production');
            expect(dbConfig.timeout).toBe(10000);
        });

        it('should throw error for invalid prefix format', () => {
            const config = { host: 'localhost' };

            // Lowercase prefix should throw
            expect(() => {
                AutoEnvParse.parse(config, 'db');
            }).toThrow(/Invalid prefix "db"/);

            // Prefix with special characters should throw
            expect(() => {
                AutoEnvParse.parse(config, 'DB_');
            }).toThrow(/Invalid prefix "DB_"/);

            // Mixed case should throw
            expect(() => {
                AutoEnvParse.parse(config, 'Db');
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

            AutoEnvParse.parse(config, 'TEST');

            expect(config.connection.host).toBe('remote.example.com');
            expect(config.connection.port).toBe(3307);
        });

        it('should support deeply nested objects', () => {
            const config = {
                database: {
                    connection: {
                        host: 'localhost',
                        port: 5432,
                        pool: {
                            min: 2,
                            max: 10
                        }
                    }
                }
            };

            process.env.TEST_DATABASE_CONNECTION_HOST = 'deep.example.com';
            process.env.TEST_DATABASE_CONNECTION_PORT = '3308';
            process.env.TEST_DATABASE_CONNECTION_POOL_MIN = '5';
            process.env.TEST_DATABASE_CONNECTION_POOL_MAX = '20';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.database.connection.host).toBe('deep.example.com');
            expect(config.database.connection.port).toBe(3308);
            expect(config.database.connection.pool.min).toBe(5);
            expect(config.database.connection.pool.max).toBe(20);
        });

        it('should convert camelCase to SNAKE_CASE for env vars', () => {
            const config = {
                databaseUrl: 'localhost',
                maxPoolSize: 10,
                enableSSL: false
            };

            process.env.TEST_DATABASE_URL = 'prod.db';
            process.env.TEST_MAX_POOL_SIZE = '50';
            process.env.TEST_ENABLE_SSL = 'true';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.databaseUrl).toBe('prod.db');
            expect(config.maxPoolSize).toBe(50);
            expect(config.enableSSL).toBe(true);
        });

        it('should handle consecutive capitals in property names', () => {
            const config = {
                HTTPSPort: 443,
                APIKey: 'default',
                XMLParser: true
            };

            process.env.TEST_HTTPS_PORT = '8443';
            process.env.TEST_API_KEY = 'secret123';
            process.env.TEST_XML_PARSER = 'false';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.HTTPSPort).toBe(8443);
            expect(config.APIKey).toBe('secret123');
            expect(config.XMLParser).toBe(false);
        });

        it('should support custom overrides', () => {
            const config = {
                port: 3000
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

            process.env.TEST_PORT = '99999';

            AutoEnvParse.parse(config, 'TEST', overrides);

            expect(config.port).toBe(3000); // Should keep default
        });

        it('should handle arrays via JSON parsing', () => {
            const config = {
                tags: ['default'],
                ports: [3000]
            };

            process.env.TEST_TAGS = '["tag1", "tag2", "tag3"]';
            process.env.TEST_PORTS = '[8080, 8081]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.tags).toEqual(['tag1', 'tag2', 'tag3']);
            expect(config.ports).toEqual([8080, 8081]);
        });

        it('should handle invalid array JSON gracefully', () => {
            const config = {
                tags: ['default']
            };

            process.env.TEST_TAGS = 'not-json';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.tags).toEqual(['default']); // Keep default
        });

        it('should handle nested object with JSON string', () => {
            const config = {
                nested: {
                    key1: 'value1',
                    key2: 10
                }
            };

            process.env.TEST_NESTED = '{"key1": "updated", "key2": 20}';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.nested.key1).toBe('updated');
            expect(config.nested.key2).toBe(20);
        });

        it('should handle nested object with invalid JSON', () => {
            const config = {
                nested: {
                    key: 'value'
                }
            };

            process.env.TEST_NESTED = 'not-json';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.nested.key).toBe('value'); // Keep default
        });

        it('should prefer dot-notation over JSON for nested objects', () => {
            const config = {
                nested: {
                    key1: 'value1',
                    key2: 10
                }
            };

            // Both JSON and dot-notation set
            process.env.TEST_NESTED = '{"key1": "from-json", "key2": 20}';
            process.env.TEST_NESTED_KEY1 = 'from-dot-notation';

            AutoEnvParse.parse(config, 'TEST');

            // Dot-notation should win
            expect(config.nested.key1).toBe('from-dot-notation');
            expect(config.nested.key2).toBe(20);
        });

        it('should handle complex nested class instances', () => {
            class NestedClass {
                value = 'default';
            }

            const config = {
                complex: new NestedClass()
            };

            process.env.TEST_COMPLEX_VALUE = 'updated';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.complex.value).toBe('updated');
        });

        it('should handle complex object with invalid JSON', () => {
            class NestedClass {
                value = 'default';
            }

            const config = {
                complex: new NestedClass()
            };

            process.env.TEST_COMPLEX = 'not-json';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.complex.value).toBe('default');
        });

        it('should handle RegExp arrays', () => {
            const config = {
                patterns: [/test/]
            };

            process.env.TEST_PATTERNS = '["^foo", "bar$"]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.patterns).toHaveLength(2);
            expect(config.patterns[0]).toBeInstanceOf(RegExp);
            expect(config.patterns[1]).toBeInstanceOf(RegExp);
            expect(config.patterns[0].source).toBe('^foo');
            expect(config.patterns[1].source).toBe('bar$');
        });

        it('should not convert regular arrays to RegExp', () => {
            const config = {
                items: ['a', 'b']
            };

            process.env.TEST_ITEMS = '["x", "y"]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.items).toEqual(['x', 'y']);
            expect(config.items[0]).not.toBeInstanceOf(RegExp);
        });

        it('should handle null/undefined values', () => {
            const config: {
                nullValue: string | null;
                undefinedValue: string | undefined;
            } = {
                nullValue: null,
                undefinedValue: undefined
            };

            process.env.TEST_NULL_VALUE = 'not-null';
            process.env.TEST_UNDEFINED_VALUE = 'defined';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.nullValue).toBe('not-null');
            expect(config.undefinedValue).toBe('defined');
        });

        it('should modify all own properties including from parent classes', () => {
            class Base {
                inherited = 'base';
            }

            class Child extends Base {
                own = 'child';
            }

            const config = new Child();

            process.env.TEST_OWN = 'updated-child';
            process.env.TEST_INHERITED = 'updated-base';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.own).toBe('updated-child');
            // In JavaScript, class properties become own properties on the instance
            expect(config.inherited).toBe('updated-base');
        });
    });

    describe('Optional prefix support', () => {
        it('should work without prefix', () => {
            const config = {
                host: 'localhost',
                port: 3000
            };

            process.env.HOST = 'example.com';
            process.env.PORT = '8080';

            AutoEnvParse.parse(config);

            expect(config.host).toBe('example.com');
            expect(config.port).toBe(8080);

            // Cleanup
            delete process.env.HOST;
            delete process.env.PORT;
        });

        it('should work with empty string prefix', () => {
            const config = {
                debug: false,
                timeout: 5000
            };

            process.env.DEBUG = 'true';
            process.env.TIMEOUT = '10000';

            AutoEnvParse.parse(config, '');

            expect(config.debug).toBe(true);
            expect(config.timeout).toBe(10000);

            // Cleanup
            delete process.env.DEBUG;
            delete process.env.TIMEOUT;
        });

        it('should handle nested objects without prefix', () => {
            const config = {
                database: {
                    host: 'localhost',
                    port: 5432
                }
            };

            process.env.DATABASE_HOST = 'prod.db';
            process.env.DATABASE_PORT = '5433';

            AutoEnvParse.parse(config);

            expect(config.database.host).toBe('prod.db');
            expect(config.database.port).toBe(5433);

            // Cleanup
            delete process.env.DATABASE_HOST;
            delete process.env.DATABASE_PORT;
        });
    });
});
