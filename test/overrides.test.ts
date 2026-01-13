import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests for override functions (enumValidator, transform).
 * These allow custom parsing and validation logic for specific properties.
 */
describe('AutoEnvParse - Overrides', () => {
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

    describe('enumValidator()', () => {
        it('should validate enum values correctly', () => {
            type Environment = 'development' | 'staging' | 'production';

            const config = {
                environment: 'development' as Environment
            };

            const overrides = new Map();
            overrides.set('environment', AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production']));

            process.env.TEST_ENVIRONMENT = 'production';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.environment).toBe('production');
        });

        it('should throw error for invalid enum values', () => {
            const config = {
                environment: 'development'
            };

            const overrides = new Map();
            overrides.set('environment', AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production']));

            process.env.TEST_ENVIRONMENT = 'invalid';

            expect(() => {
                AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });
            }).toThrow(/Invalid value for TEST_ENVIRONMENT: "invalid"/);
        });

        it('should keep default value when env var not set', () => {
            const config = {
                environment: 'development'
            };

            const overrides = new Map();
            overrides.set('environment', AutoEnvParse.enumValidator('environment', ['development', 'staging', 'production']));

            delete process.env.TEST_ENVIRONMENT;

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.environment).toBe('development');
        });

        it('should support case-insensitive matching', () => {
            const config = {
                logLevel: 'INFO'
            };

            const overrides = new Map();
            overrides.set('logLevel', AutoEnvParse.enumValidator('logLevel', ['DEBUG', 'INFO', 'WARN', 'ERROR'], { caseSensitive: false }));

            process.env.TEST_LOG_LEVEL = 'debug';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            // Should use the original case from allowedValues
            expect(config.logLevel).toBe('DEBUG');
        });

        it('should be case-sensitive by default', () => {
            const config = {
                status: 'Active'
            };

            const overrides = new Map();
            overrides.set('status', AutoEnvParse.enumValidator('status', ['Active', 'Inactive']));

            process.env.TEST_STATUS = 'active';

            expect(() => {
                AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });
            }).toThrow(/Invalid value for TEST_STATUS: "active"/);
        });

        it('should preserve original case from allowedValues', () => {
            const config = {
                mode: 'read'
            };

            const overrides = new Map();
            overrides.set('mode', AutoEnvParse.enumValidator('mode', ['read', 'write', 'admin']));

            process.env.TEST_MODE = 'write';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.mode).toBe('write');
        });
    });

    describe('transform()', () => {
        it('should apply custom transformation to string values', () => {
            const config = {
                timeout: 30000
            };

            const overrides = new Map([
                ['timeout', AutoEnvParse.transform('timeout', (val) => Math.max(parseInt(val), 1000))]
            ]);

            process.env.TEST_TIMEOUT = '500';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.timeout).toBe(1000); // Clamped to minimum
        });

        it('should handle array transformations', () => {
            const config = {
                tags: [] as string[]
            };

            const overrides = new Map([
                ['tags', AutoEnvParse.transform('tags', (val) => val.split(',').map(t => t.trim()))]
            ]);

            process.env.TEST_TAGS = 'alpha, beta , gamma';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.tags).toEqual(['alpha', 'beta', 'gamma']);
        });

        it('should handle complex transformations', () => {
            const config = {
                config: {} as Record<string, string>
            };

            const overrides = new Map([
                ['config', AutoEnvParse.transform('config', (val) => JSON.parse(val))]
            ]);

            process.env.TEST_CONFIG = '{"key1":"value1","key2":"value2"}';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.config).toEqual({ key1: 'value1', key2: 'value2' });
        });

        it('should keep default value when env var not set', () => {
            const config = {
                timeout: 30000
            };

            const overrides = new Map([
                ['timeout', AutoEnvParse.transform('timeout', (val) => parseInt(val))]
            ]);

            delete process.env.TEST_TIMEOUT;

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.timeout).toBe(30000); // Default value preserved
        });

        it('should handle transformation errors gracefully', () => {
            const config = {
                data: null as unknown
            };

            const overrides = new Map([
                ['data', AutoEnvParse.transform('data', (_val) => {
                    throw new Error('Transform failed');
                })]
            ]);

            process.env.TEST_DATA = 'some-value';

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Warning: Transform failed for TEST_DATA')
            );
            expect(config.data).toBeNull(); // Default value preserved on error

            consoleWarnSpy.mockRestore();
        });

        it('should handle non-Error thrown values', () => {
            const config = {
                data: null as unknown
            };

            const overrides = new Map([
                ['data', AutoEnvParse.transform('data', (_val) => {
                    throw 'String error'; // Non-Error thrown value
                })]
            ]);

            process.env.TEST_DATA = 'some-value';

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Warning: Transform failed for TEST_DATA: String error'
            );
            expect(config.data).toBeNull(); // Default value preserved

            consoleWarnSpy.mockRestore();
        });

        it('should work with multiple transforms', () => {
            const config = {
                retries: 3,
                timeout: 5000,
                hosts: [] as string[]
            };

            const overrides = new Map([
                ['retries', AutoEnvParse.transform('retries', (val) => Math.min(parseInt(val), 10))],
                ['timeout', AutoEnvParse.transform('timeout', (val) => parseInt(val) * 1000)],
                ['hosts', AutoEnvParse.transform('hosts', (val) => val.split(',').map(h => h.trim()))]
            ]);

            process.env.TEST_RETRIES = '15';
            process.env.TEST_TIMEOUT = '30';
            process.env.TEST_HOSTS = 'host1.com, host2.com';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.retries).toBe(10); // Clamped to max
            expect(config.timeout).toBe(30000); // Multiplied by 1000
            expect(config.hosts).toEqual(['host1.com', 'host2.com']);
        });

        it('should work with class instances', () => {
            class AppConfig {
                timeout = 30000;
                tags = [] as string[];
            }

            const overrides = new Map([
                ['timeout', AutoEnvParse.transform('timeout', (val) => Math.max(parseInt(val), 1000))],
                ['tags', AutoEnvParse.transform('tags', (val) => val.split(','))]
            ]);

            process.env.TEST_TIMEOUT = '500';
            process.env.TEST_TAGS = 'tag1,tag2,tag3';

            const config = AutoEnvParse.parse(AppConfig, { prefix: 'TEST', overrides: overrides });

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.timeout).toBe(1000);
            expect(config.tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should handle type conversions', () => {
            const config = {
                port: 3000,
                enabled: false,
                ratio: 0.5
            };

            const overrides = new Map([
                ['port', AutoEnvParse.transform('port', (val) => parseInt(val))],
                ['enabled', AutoEnvParse.transform('enabled', (val) => val === 'true')],
                ['ratio', AutoEnvParse.transform('ratio', (val) => parseFloat(val))]
            ]);

            process.env.TEST_PORT = '8080';
            process.env.TEST_ENABLED = 'true';
            process.env.TEST_RATIO = '0.75';

            AutoEnvParse.parse(config, { prefix: 'TEST', overrides: overrides });

            expect(config.port).toBe(8080);
            expect(config.enabled).toBe(true);
            expect(config.ratio).toBe(0.75);
        });
    });
});
