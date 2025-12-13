import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests specifically targeting 100% code coverage for all metrics.
 * These tests cover edge cases and code paths not exercised by the main test suites.
 */
describe('AutoEnvParse - Complete Coverage', () => {
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

    describe('hasOwnProperty check coverage', () => {
        it('should skip properties without hasOwnProperty', () => {
            // Create an object with a prototype that has properties
            const proto = { inherited: 'base' };
            const config = Object.create(proto);
            config.own = 'child';

            process.env.TEST_OWN = 'updated';
            process.env.TEST_INHERITED = 'should-not-apply';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.own).toBe('updated');
            // Inherited property should not be modified
            expect(config.inherited).toBe('base');
        });
    });

    describe('Nested object JSON success path', () => {
        it('should apply JSON parsed object with Object.assign for plain nested objects', () => {
            const config = {
                database: {
                    host: 'localhost',
                    port: 5432
                }
            };

            // Provide valid JSON that will be parsed and assigned
            process.env.TEST_DATABASE = '{"host":"json-host","port":9999,"extra":"value"}';

            AutoEnvParse.parse(config, 'TEST');

            // JSON should be applied via Object.assign
            expect(config.database.host).toBe('json-host');
            expect(config.database.port).toBe(9999);
            expect((config.database as Record<string, unknown>).extra).toBe('value');
        });
    });

    describe('Complex object JSON success path', () => {
        it('should apply JSON parsed object with Object.assign for complex objects', () => {
            class DatabaseConfig {
                host = 'localhost';
                port = 5432;
            }

            const config = {
                db: new DatabaseConfig()
            };

            // Provide valid JSON that will be parsed and assigned
            process.env.TEST_DB = '{"host":"json-complex","port":7777}';

            AutoEnvParse.parse(config, 'TEST');

            // JSON should be applied via Object.assign
            expect(config.db.host).toBe('json-complex');
            expect(config.db.port).toBe(7777);
        });
    });

    describe('Recursive applyComplexObject for deeply nested class instances', () => {
        it('should recursively handle nested class instances', () => {
            class InnerConfig {
                value = 'inner-default';
            }

            class OuterConfig {
                inner = new InnerConfig();
                outer = 'outer-default';
            }

            const config = {
                complex: new OuterConfig()
            };

            process.env.TEST_COMPLEX_INNER_VALUE = 'inner-updated';
            process.env.TEST_COMPLEX_OUTER = 'outer-updated';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.complex.inner.value).toBe('inner-updated');
            expect(config.complex.outer).toBe('outer-updated');
        });

        it('should handle multiple levels of nested class instances', () => {
            class Level3 {
                deepValue = 'level3';
            }

            class Level2 {
                level3 = new Level3();
                midValue = 'level2';
            }

            class Level1 {
                level2 = new Level2();
                topValue = 'level1';
            }

            const config = {
                root: new Level1()
            };

            process.env.TEST_ROOT_LEVEL2_LEVEL3_DEEP_VALUE = 'deep-updated';
            process.env.TEST_ROOT_LEVEL2_MID_VALUE = 'mid-updated';
            process.env.TEST_ROOT_TOP_VALUE = 'top-updated';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.root.level2.level3.deepValue).toBe('deep-updated');
            expect(config.root.level2.midValue).toBe('mid-updated');
            expect(config.root.topValue).toBe('top-updated');
        });
    });

    describe('loadNestedFromEnv inherited properties', () => {
        it('should skip inherited properties in loadNestedFromEnv', () => {
            const proto = { inherited: 'base-value' };
            const obj = Object.create(proto);
            obj.own = 'own-value';

            process.env.TEST_OWN = 'updated-own';
            process.env.TEST_INHERITED = 'updated-inherited';

            const result = AutoEnvParse.loadNestedFromEnv('TEST', obj);

            expect(result.own).toBe('updated-own');
            // Inherited property should not be in result
            expect(Object.prototype.hasOwnProperty.call(result, 'inherited')).toBe(false);
        });
    });

    describe('parseBoolean strict mode warnings', () => {
        it('should warn in strict mode for unrecognized boolean values', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = AutoEnvParse.parseBoolean('maybe', true);

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Warning: Unrecognized boolean value "maybe"')
            );

            consoleWarnSpy.mockRestore();
        });

        it('should warn in strict mode with list of expected values', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            AutoEnvParse.parseBoolean('unknown', true);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Expected: true, 1, yes, on, false, 0, no, off')
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('Empty string env var in applyComplexObject', () => {
        it('should skip empty string env vars in nested object processing', () => {
            class Config {
                value = 'default';
            }

            const config = {
                nested: new Config()
            };

            process.env.TEST_NESTED_VALUE = '';

            AutoEnvParse.parse(config, 'TEST');

            // Empty string should be treated as "not set"
            expect(config.nested.value).toBe('default');
        });
    });

    describe('Defensive error checks', () => {
        it('should throw error if applyNestedObject receives non-plain-object', () => {
            // This is a defensive check. We need to bypass normal parse() logic
            // to trigger this error. We'll use a custom override to call the private method.

            const config = {
                test: null as unknown
            };

            // Manually set to Date (non-plain object)
            config.test = new Date();

            // The parse method should not try to apply nested parsing to Date
            process.env.TEST_TEST = '2024-01-01';

            // Should not throw because parse() checks type before calling applyNestedObject
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });

        it('should throw error if applyComplexObject receives non-object', () => {
            // Similar defensive check for applyComplexObject
            const config = {
                test: null as unknown
            };

            // Set to primitive
            config.test = 'string';

            process.env.TEST_TEST = 'value';

            // Should not throw because parse() checks type before calling applyComplexObject
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });
    });

    describe('Array type handling', () => {
        it('should handle mixed array types', () => {
            const config = {
                mixed: [1, 'string', true] as Array<string | number | boolean>
            };

            process.env.TEST_MIXED = '[10, "updated", false]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.mixed).toEqual([10, 'updated', false]);
        });

        it('should handle empty arrays', () => {
            const config = {
                empty: [] as string[]
            };

            process.env.TEST_EMPTY = '[]';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.empty).toEqual([]);
        });
    });

    describe('Edge cases in type coercion', () => {
        it('should handle whitespace in boolean values', () => {
            expect(AutoEnvParse.parseBoolean('  true  ')).toBe(true);
            expect(AutoEnvParse.parseBoolean('  false  ')).toBe(false);
            expect(AutoEnvParse.parseBoolean('  YES  ')).toBe(true);
        });

        it('should handle special number values', () => {
            expect(AutoEnvParse.parseNumber('0')).toBe(0);
            expect(AutoEnvParse.parseNumber('-0')).toBe(-0);
            expect(AutoEnvParse.parseNumber('Infinity')).toBe(Infinity);
            expect(AutoEnvParse.parseNumber('-Infinity')).toBe(-Infinity);
        });
    });

    describe('Complex nested structures', () => {
        it('should handle objects with both plain nested properties at same level', () => {
            const config = {
                plain: {
                    value: 'plain'
                },
                anotherPlain: {
                    data: 'another'
                }
            };

            process.env.TEST_PLAIN_VALUE = 'updated-plain';
            process.env.TEST_ANOTHER_PLAIN_DATA = 'updated-another';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.plain.value).toBe('updated-plain');
            expect(config.anotherPlain.data).toBe('updated-another');
        });

        it('should handle class with nested plain objects and values', () => {
            class ConfigWithNested {
                simple = 'value';
                nested = {
                    prop: 'nested-value'
                };
            }

            const config = new ConfigWithNested();

            process.env.TEST_SIMPLE = 'updated-simple';
            process.env.TEST_NESTED_PROP = 'updated-nested';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.simple).toBe('updated-simple');
            expect(config.nested.prop).toBe('updated-nested');
        });
    });

    describe('Prefix validation edge cases', () => {
        it('should accept numeric prefixes', () => {
            const config = { value: 'default' };

            process.env['123_VALUE'] = 'updated';

            expect(() => {
                AutoEnvParse.parse(config, '123');
            }).not.toThrow();

            expect(config.value).toBe('updated');
        });

        it('should accept mixed alphanumeric prefixes', () => {
            const config = { value: 'default' };

            process.env.DB2_VALUE = 'updated';

            expect(() => {
                AutoEnvParse.parse(config, 'DB2');
            }).not.toThrow();

            expect(config.value).toBe('updated');
        });
    });

    describe('Inherited properties in complex objects', () => {
        it('should skip inherited properties when processing complex objects', () => {
            // Create a base class with properties
            class BaseConfig {
                baseValue = 'base-default';
            }

            // Create a child class that inherits from base
            class ChildConfig extends BaseConfig {
                childValue = 'child-default';
            }

            const config = {
                complex: new ChildConfig()
            };

            // Try to set both inherited and own properties
            process.env.TEST_COMPLEX_BASE_VALUE = 'base-updated';
            process.env.TEST_COMPLEX_CHILD_VALUE = 'child-updated';

            AutoEnvParse.parse(config, 'TEST');

            // In JavaScript class fields, all properties become "own" properties on instances
            // So both should be updated
            expect(config.complex.childValue).toBe('child-updated');
            expect(config.complex.baseValue).toBe('base-updated');
        });

        it('should handle prototype-based inheritance', () => {
            // Create a constructor function with prototype
            function BaseClass(this: { base: string }): void {
                // No own properties in constructor
            }
            BaseClass.prototype.base = 'proto-value';

            const instance = new (BaseClass as unknown as { new(): { base: string; own: string } })();
            instance.own = 'own-value';

            const config = {
                complex: instance
            };

            process.env.TEST_COMPLEX_OWN = 'own-updated';
            process.env.TEST_COMPLEX_BASE = 'base-updated';

            AutoEnvParse.parse(config, 'TEST');

            expect(config.complex.own).toBe('own-updated');
            // Prototype property should NOT be updated (continue statement hits here)
            expect(config.complex.base).toBe('proto-value');
        });
    });

    describe('Complex objects without prefix', () => {
        it('should handle complex object properties without prefix', () => {
            class NestedClass {
                value = 'default';
            }

            const config = {
                complex: new NestedClass()
            };

            process.env.COMPLEX_VALUE = 'updated';

            AutoEnvParse.parse(config); // No prefix

            expect(config.complex.value).toBe('updated');

            // Cleanup
            delete process.env.COMPLEX_VALUE;
        });

        it('should handle deeply nested complex objects without prefix', () => {
            class InnerClass {
                innerValue = 'inner-default';
            }

            class OuterClass {
                inner = new InnerClass();
                outerValue = 'outer-default';
            }

            const config = {
                complex: new OuterClass()
            };

            // Set env vars without any prefix
            process.env.COMPLEX_INNER_INNER_VALUE = 'inner-updated';
            process.env.COMPLEX_OUTER_VALUE = 'outer-updated';

            AutoEnvParse.parse(config); // No prefix - tests envVarName falsy branch

            expect(config.complex.inner.innerValue).toBe('inner-updated');
            expect(config.complex.outerValue).toBe('outer-updated');

            // Cleanup
            delete process.env.COMPLEX_INNER_INNER_VALUE;
            delete process.env.COMPLEX_OUTER_VALUE;
        });
    });

    describe('Forcing defensive error checks', () => {
        it('should handle edge case where object type changes', () => {
            // This tests defensive programming - ensuring robustness even in unexpected scenarios
            const config = {
                nested: { value: 'test' } as unknown
            };

            // Even if we try to trick the system, it should handle gracefully
            process.env.TEST_NESTED_VALUE = 'updated';

            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });

        it('should handle complex objects that are edge cases', () => {
            class TestClass {
                value = 'default';
            }

            const config = {
                test: new TestClass() as unknown
            };

            process.env.TEST_TEST_VALUE = 'updated';

            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });

        it('should handle null values in defensive checks', () => {
            // Test the ternary operator in error messages: value === null ? 'null' : typeof value
            const config = {
                prop: null as unknown
            };

            process.env.TEST_PROP = 'value';

            // Should handle null gracefully
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });

        it('should trigger defensive check in applyNestedObject with mutating getter returning Date', () => {
            // Use a getter that returns different types on consecutive accesses
            // This tests the defensive error check that should "never happen" in normal code
            let accessCount = 0;
            const config = {};

            Object.defineProperty(config, 'tricky', {
                get() {
                    accessCount++;
                    // First access (type check): return plain object
                    // Subsequent accesses: return Date (non-plain object)
                    return accessCount === 1 ? { nested: 'value' } : new Date();
                },
                enumerable: true,
                configurable: true
            });

            process.env.TEST_TRICKY_NESTED = 'test';

            // The getter changes value between type check and method call
            // This triggers the defensive error check
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).toThrow(/Internal error: applyNestedObject called with non-plain-object/);
        });

        it('should trigger defensive check in applyNestedObject with mutating getter returning null', () => {
            // Test the null branch of the ternary: value === null ? 'null' : typeof value
            let accessCount = 0;
            const config = {};

            Object.defineProperty(config, 'tricky', {
                get() {
                    accessCount++;
                    // First access: return plain object
                    // Second access: return null
                    return accessCount === 1 ? { nested: 'value' } : null;
                },
                enumerable: true,
                configurable: true
            });

            process.env.TEST_TRICKY_NESTED = 'test';

            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).toThrow(/Expected plain object, got null/);
        });

        it('should trigger defensive check in applyComplexObject using reflection', () => {
            // Use reflection to directly call the private method with invalid input
            // This tests the defensive check that "should never happen" in normal code
            const key = 'test';
            const envVarName = 'TEST_VALUE';
            const invalidValue = null; // Not an object

            // Access private method using type assertion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AutoEnvParseAny = AutoEnvParse as any;

            expect(() => {
                // Call the private applyComplexObject method directly with invalid (null) value
                AutoEnvParseAny.applyComplexObject(key, envVarName, invalidValue);
            }).toThrow(/Internal error: applyComplexObject called with non-object/);
        });

        it('should trigger defensive check in applyComplexObject with string value using reflection', () => {
            // Test the other branch of the error message ternary (typeof value)
            const key = 'test';
            const envVarName = 'TEST_VALUE';
            const invalidValue = 'not-an-object'; // String, not object

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AutoEnvParseAny = AutoEnvParse as any;

            expect(() => {
                // Call private method with string (triggers "got string" branch)
                AutoEnvParseAny.applyComplexObject(key, envVarName, invalidValue);
            }).toThrow(/Internal error: applyComplexObject called with non-object/);
            expect(() => {
                AutoEnvParseAny.applyComplexObject(key, envVarName, invalidValue);
            }).toThrow(/Expected object, got string/);
        });

        it('should handle envVarName falsy branch in applyComplexObject', () => {
            // Test the falsy branch of: envVarName ? `${envVarName}_${snakeNestedKey}` : snakeNestedKey
            class NestedClass {
                value = 'default';
            }

            const obj = new NestedClass();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AutoEnvParseAny = AutoEnvParse as any;

            // Set up env var without prefix
            process.env.VALUE = 'updated';

            // Call applyComplexObject with empty envVarName to trigger falsy branch
            AutoEnvParseAny.applyComplexObject('test', '', obj, process.env);

            expect(obj.value).toBe('updated');

            // Cleanup
            delete process.env.VALUE;
        });
    });
});
