import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests for nested array support with dot-notation.
 * Covers array of objects, sparse arrays, multilevel nesting, and backward compatibility.
 */
describe('AutoEnvParse - Nested Array Support', () => {
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

    describe('Basic array of objects', () => {
        it('should parse array of objects using dot-notation', () => {
            const config = {
                servers: [{
                    host: 'localhost',
                    port: 3000
                }]
            };

            process.env.TEST_SERVERS_0_HOST = 'server1.com';
            process.env.TEST_SERVERS_0_PORT = '8080';
            process.env.TEST_SERVERS_1_HOST = 'server2.com';
            process.env.TEST_SERVERS_1_PORT = '8081';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.servers).toHaveLength(2);
            expect(config.servers[0].host).toBe('server1.com');
            expect(config.servers[0].port).toBe(8080);
            expect(config.servers[1].host).toBe('server2.com');
            expect(config.servers[1].port).toBe(8081);
        });

        it('should handle single array element', () => {
            const config = {
                databases: [{
                    name: 'default',
                    host: 'localhost',
                    port: 5432
                }]
            };

            process.env.TEST_DATABASES_0_NAME = 'production';
            process.env.TEST_DATABASES_0_HOST = 'prod.db.com';
            process.env.TEST_DATABASES_0_PORT = '5433';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.databases).toHaveLength(1);
            expect(config.databases[0].name).toBe('production');
            expect(config.databases[0].host).toBe('prod.db.com');
            expect(config.databases[0].port).toBe(5433);
        });

        it('should handle boolean and number coercion in array elements', () => {
            const config = {
                endpoints: [{
                    url: '',
                    timeout: 5000,
                    enabled: true
                }]
            };

            process.env.TEST_ENDPOINTS_0_URL = 'https://api1.com';
            process.env.TEST_ENDPOINTS_0_TIMEOUT = '3000';
            process.env.TEST_ENDPOINTS_0_ENABLED = 'false';
            process.env.TEST_ENDPOINTS_1_URL = 'https://api2.com';
            process.env.TEST_ENDPOINTS_1_TIMEOUT = '6000';
            process.env.TEST_ENDPOINTS_1_ENABLED = 'true';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.endpoints).toHaveLength(2);
            expect(config.endpoints[0].timeout).toBe(3000);
            expect(config.endpoints[0].enabled).toBe(false);
            expect(config.endpoints[1].timeout).toBe(6000);
            expect(config.endpoints[1].enabled).toBe(true);
        });
    });

    describe('Sparse arrays', () => {
        it('should create compact array from sparse indices', () => {
            const config = {
                items: [{
                    id: 0,
                    name: ''
                }]
            };

            // Sparse: indices 0, 2, 5 (missing 1, 3, 4)
            process.env.TEST_ITEMS_0_ID = '10';
            process.env.TEST_ITEMS_0_NAME = 'first';
            process.env.TEST_ITEMS_2_ID = '20';
            process.env.TEST_ITEMS_2_NAME = 'second';
            process.env.TEST_ITEMS_5_ID = '30';
            process.env.TEST_ITEMS_5_NAME = 'third';

            AutoEnvParse.parse(config, 'TEST');

            // Should be compact (no undefined elements)
            expect(config.items).toHaveLength(3);
            expect(config.items[0].id).toBe(10);
            expect(config.items[0].name).toBe('first');
            expect(config.items[1].id).toBe(20);
            expect(config.items[1].name).toBe('second');
            expect(config.items[2].id).toBe(30);
            expect(config.items[2].name).toBe('third');
        });

        it('should sort indices correctly', () => {
            const config = {
                sorted: [{
                    value: 0
                }]
            };

            // Set in non-sequential order
            process.env.TEST_SORTED_3_VALUE = '30';
            process.env.TEST_SORTED_1_VALUE = '10';
            process.env.TEST_SORTED_2_VALUE = '20';
            process.env.TEST_SORTED_0_VALUE = '0';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.sorted).toHaveLength(4);
            expect(config.sorted[0].value).toBe(0);
            expect(config.sorted[1].value).toBe(10);
            expect(config.sorted[2].value).toBe(20);
            expect(config.sorted[3].value).toBe(30);
        });
    });

    describe('Multilevel nesting', () => {
        it('should handle nested objects within array elements', () => {
            const config = {
                services: [{
                    name: '',
                    config: {
                        host: 'localhost',
                        port: 3000
                    }
                }]
            };

            process.env.TEST_SERVICES_0_NAME = 'web';
            process.env.TEST_SERVICES_0_CONFIG_HOST = 'web1.com';
            process.env.TEST_SERVICES_0_CONFIG_PORT = '8080';
            process.env.TEST_SERVICES_1_NAME = 'api';
            process.env.TEST_SERVICES_1_CONFIG_HOST = 'api1.com';
            process.env.TEST_SERVICES_1_CONFIG_PORT = '8081';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.services).toHaveLength(2);
            expect(config.services[0].name).toBe('web');
            expect(config.services[0].config.host).toBe('web1.com');
            expect(config.services[0].config.port).toBe(8080);
            expect(config.services[1].name).toBe('api');
            expect(config.services[1].config.host).toBe('api1.com');
            expect(config.services[1].config.port).toBe(8081);
        });

        it('should handle deeply nested objects', () => {
            const config = {
                clusters: [{
                    name: '',
                    settings: {
                        database: {
                            host: 'localhost',
                            port: 5432
                        }
                    }
                }]
            };

            process.env.TEST_CLUSTERS_0_NAME = 'cluster1';
            process.env.TEST_CLUSTERS_0_SETTINGS_DATABASE_HOST = 'db1.com';
            process.env.TEST_CLUSTERS_0_SETTINGS_DATABASE_PORT = '5433';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.clusters).toHaveLength(1);
            expect(config.clusters[0].name).toBe('cluster1');
            expect(config.clusters[0].settings.database.host).toBe('db1.com');
            expect(config.clusters[0].settings.database.port).toBe(5433);
        });
    });

    describe('Empty arrays', () => {
        it('should skip empty arrays (no template)', () => {
            const config = {
                empty: [] as Array<{ value: string }>
            };

            process.env.TEST_EMPTY_0_VALUE = 'should-not-parse';

            AutoEnvParse.parse(config, 'TEST');

            // Should remain empty (no template to infer from)
            expect(config.empty).toHaveLength(0);
        });
    });

    describe('Priority: dot-notation over JSON', () => {
        it('should use dot-notation when both formats exist', () => {
            const config = {
                data: [{
                    value: ''
                }]
            };

            // Both JSON and dot-notation
            process.env.TEST_DATA = '[{"value":"from-json"}]';
            process.env.TEST_DATA_0_VALUE = 'from-dot-notation';

            AutoEnvParse.parse(config, 'TEST');

            // Dot-notation should win
            expect(config.data).toHaveLength(1);
            expect(config.data[0].value).toBe('from-dot-notation');
        });
    });

    describe('Backward compatibility - JSON still works', () => {
        it('should fall back to JSON when no dot-notation found', () => {
            const config = {
                items: [{
                    id: 0,
                    name: ''
                }]
            };

            process.env.TEST_ITEMS = '[{"id":10,"name":"json1"},{"id":20,"name":"json2"}]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.items).toHaveLength(2);
            expect(config.items[0].id).toBe(10);
            expect(config.items[0].name).toBe('json1');
            expect(config.items[1].id).toBe(20);
            expect(config.items[1].name).toBe('json2');
        });

        it('should handle invalid JSON with warning', () => {
            const config = {
                items: [{
                    value: 'default'
                }]
            };

            process.env.TEST_ITEMS = 'not-valid-json';

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            AutoEnvParse.parse(config, 'TEST');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Warning: Invalid TEST_ITEMS format')
            );
            // Should keep default
            expect(config.items[0].value).toBe('default');

            consoleWarnSpy.mockRestore();
        });
    });

    describe('RegExp arrays - JSON only', () => {
        it('should handle RegExp arrays via JSON only', () => {
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

        it('should not attempt dot-notation for RegExp arrays', () => {
            const config = {
                patterns: [/test/]
            };

            // Dot-notation env vars should be ignored for RegExp arrays
            process.env.TEST_PATTERNS_0_SOURCE = '^should-not-parse';
            process.env.TEST_PATTERNS = '["^works"]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.patterns).toHaveLength(1);
            expect(config.patterns[0].source).toBe('^works');
        });
    });

    describe('Partial updates', () => {
        it('should update only specified array elements', () => {
            const config = {
                servers: [{
                    host: 'default-host',
                    port: 3000
                }]
            };

            // Only update index 1
            process.env.TEST_SERVERS_1_HOST = 'server2.com';
            process.env.TEST_SERVERS_1_PORT = '9000';

            AutoEnvParse.parse(config, 'TEST');

            // Should create array with just index 1
            expect(config.servers).toHaveLength(1);
            expect(config.servers[0].host).toBe('server2.com');
            expect(config.servers[0].port).toBe(9000);
        });

        it('should handle partial property updates in array elements', () => {
            const config = {
                items: [{
                    name: 'default-name',
                    value: 'default-value',
                    count: 0
                }]
            };

            // Only set name and count, not value
            process.env.TEST_ITEMS_0_NAME = 'updated-name';
            process.env.TEST_ITEMS_0_COUNT = '42';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.items[0].name).toBe('updated-name');
            expect(config.items[0].value).toBe('default-value'); // Keeps default
            expect(config.items[0].count).toBe(42);
        });
    });

    describe('Mixed types in array elements', () => {
        it('should handle mix of strings, numbers, and booleans', () => {
            const config = {
                mixed: [{
                    str: '',
                    num: 0,
                    bool: false
                }]
            };

            process.env.TEST_MIXED_0_STR = 'hello';
            process.env.TEST_MIXED_0_NUM = '123';
            process.env.TEST_MIXED_0_BOOL = 'true';
            process.env.TEST_MIXED_1_STR = 'world';
            process.env.TEST_MIXED_1_NUM = '456';
            process.env.TEST_MIXED_1_BOOL = 'false';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.mixed).toHaveLength(2);
            expect(config.mixed[0].str).toBe('hello');
            expect(config.mixed[0].num).toBe(123);
            expect(config.mixed[0].bool).toBe(true);
            expect(config.mixed[1].str).toBe('world');
            expect(config.mixed[1].num).toBe(456);
            expect(config.mixed[1].bool).toBe(false);
        });
    });

    describe('camelCase to SNAKE_CASE conversion', () => {
        it('should convert property names in array elements', () => {
            const config = {
                apiEndpoints: [{
                    baseUrl: '',
                    maxRetries: 3,
                    timeoutMs: 5000
                }]
            };

            process.env.TEST_API_ENDPOINTS_0_BASE_URL = 'https://api.com';
            process.env.TEST_API_ENDPOINTS_0_MAX_RETRIES = '5';
            process.env.TEST_API_ENDPOINTS_0_TIMEOUT_MS = '10000';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.apiEndpoints).toHaveLength(1);
            expect(config.apiEndpoints[0].baseUrl).toBe('https://api.com');
            expect(config.apiEndpoints[0].maxRetries).toBe(5);
            expect(config.apiEndpoints[0].timeoutMs).toBe(10000);
        });
    });

    describe('Without prefix', () => {
        it('should work without prefix', () => {
            const config = {
                items: [{
                    value: ''
                }]
            };

            process.env.ITEMS_0_VALUE = 'no-prefix-1';
            process.env.ITEMS_1_VALUE = 'no-prefix-2';

            AutoEnvParse.parse(config);

            expect(config.items).toHaveLength(2);
            expect(config.items[0].value).toBe('no-prefix-1');
            expect(config.items[1].value).toBe('no-prefix-2');

            // Cleanup
            delete process.env.ITEMS_0_VALUE;
            delete process.env.ITEMS_1_VALUE;
        });
    });

    describe('Edge cases for coverage', () => {
        it('should handle arrays of primitives with dot-notation indices', () => {
            const config = {
                numbers: [0]
            };

            // For primitive arrays, dot-notation detection happens but
            // elements remain as template values since primitives can't have nested properties
            process.env.TEST_NUMBERS_0_VALUE = '10';
            process.env.TEST_NUMBERS_1_VALUE = '20';

            AutoEnvParse.parse(config, 'TEST');

            // Array should be created based on indices, but values remain as template
            expect(config.numbers).toHaveLength(2);
        });

        it('should skip inherited properties in array element objects', () => {
            // Test that inherited properties are skipped in parseObjectPropertiesRecursive
            // This test uses a template with an inherited property
            const proto = { inherited: 'base-value' };
            const template = Object.create(proto);
            template.own = 'own-value';

            const config = {
                items: [template]
            };

            process.env.TEST_ITEMS_0_OWN = 'updated-own';
            process.env.TEST_ITEMS_0_INHERITED = 'should-not-update';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.items).toHaveLength(1);
            expect(config.items[0].own).toBe('updated-own');
            // After JSON serialization, inherited properties are not copied
            // So the result won't have the inherited property at all
            expect(Object.prototype.hasOwnProperty.call(config.items[0], 'inherited')).toBe(false);
        });

        it('should trigger continue branch for inherited properties using manual object manipulation', () => {
            // Directly test parseObjectPropertiesRecursive by creating an object
            // with inherited properties after JSON parsing
            const template = { own: 'value' };

            // Create an object with inherited property AFTER parsing starts
            const proto = { inherited: 'base' };
            const targetWithInherited = Object.create(proto);
            targetWithInherited.own = 'value';

            // Manually invoke parseObjectPropertiesRecursive via reflection
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AutoEnvParseAny = AutoEnvParse as any;

            process.env.TEST_ITEMS_0_OWN = 'updated';

            // This should skip the inherited property due to hasOwnProperty check
            AutoEnvParseAny.parseObjectPropertiesRecursive(
                targetWithInherited,
                'TEST_ITEMS_0',
                template
            );

            // Own property should be updated
            expect(targetWithInherited.own).toBe('updated');
            // Inherited property should not be updated (stays on prototype)
            expect(targetWithInherited.inherited).toBe('base');
            expect(Object.prototype.hasOwnProperty.call(targetWithInherited, 'inherited')).toBe(false);
        });
    });
});
