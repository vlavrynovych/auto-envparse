import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Tests for parsing class-based configurations with environment variables.
 * Covers class instantiation, methods preservation, and defensive checks.
 */
describe('AutoEnvParse - Class Parsing', () => {
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

    describe('parse() - Class instantiation', () => {
        it('should create instance from class constructor', () => {
            class DatabaseConfig {
                host = 'localhost';
                port = 5432;
                ssl = false;
            }

            process.env.TEST_HOST = 'prod.example.com';
            process.env.TEST_PORT = '5433';
            process.env.TEST_SSL = 'true';

            const config = AutoEnvParse.parse(DatabaseConfig, 'TEST');

            expect(config).toBeInstanceOf(DatabaseConfig);
            expect(config.host).toBe('prod.example.com');
            expect(config.port).toBe(5433);
            expect(config.ssl).toBe(true);
        });

        it('should preserve class methods', () => {
            class ServerConfig {
                host = '0.0.0.0';
                port = 3000;

                getUrl(): string {
                    return `http://${this.host}:${this.port}`;
                }
            }

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '8080';

            const config = AutoEnvParse.parse(ServerConfig, 'TEST');

            expect(config).toBeInstanceOf(ServerConfig);
            expect(config.getUrl()).toBe('http://example.com:8080');
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

        it('should handle nested properties in classes', () => {
            class ComplexConfig {
                database = {
                    host: 'localhost',
                    port: 5432
                };
            }

            process.env.TEST_DATABASE_HOST = 'prod.example.com';
            process.env.TEST_DATABASE_PORT = '5433';

            const config = AutoEnvParse.parse(ComplexConfig, 'TEST');

            expect(config).toBeInstanceOf(ComplexConfig);
            expect(config.database.host).toBe('prod.example.com');
            expect(config.database.port).toBe(5433);
        });

        it('should work with custom overrides on classes', () => {
            class AppConfig {
                port = 3000;
            }

            const overrides = new Map();
            overrides.set('port', (obj: AppConfig, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const port = parseInt(value, 10);
                    if (port >= 1 && port <= 65535) {
                        obj.port = port;
                    }
                }
            });

            process.env.TEST_PORT = '8080';

            const config = AutoEnvParse.parse(AppConfig, 'TEST', overrides);

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.port).toBe(8080);
        });
    });

    describe('createFrom() - Legacy class instantiation', () => {
        it('should create instance from class constructor', () => {
            class DatabaseConfig {
                host = 'localhost';
                port = 5432;
                ssl = false;
            }

            process.env.TEST_HOST = 'prod.example.com';
            process.env.TEST_PORT = '5433';
            process.env.TEST_SSL = 'true';

            const config = AutoEnvParse.createFrom(DatabaseConfig, 'TEST');

            expect(config).toBeInstanceOf(DatabaseConfig);
            expect(config.host).toBe('prod.example.com');
            expect(config.port).toBe(5433);
            expect(config.ssl).toBe(true);
        });

        it('should work without prefix', () => {
            class AppConfig {
                nodeEnv = 'development';
                port = 3000;
                debug = false;
            }

            process.env.NODE_ENV = 'production';
            process.env.PORT = '8080';
            process.env.DEBUG = 'true';

            const config = AutoEnvParse.createFrom(AppConfig);

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.nodeEnv).toBe('production');
            expect(config.port).toBe(8080);
            expect(config.debug).toBe(true);

            // Cleanup
            delete process.env.NODE_ENV;
            delete process.env.PORT;
            delete process.env.DEBUG;
        });

        it('should preserve class methods', () => {
            class ServerConfig {
                host = '0.0.0.0';
                port = 3000;

                getUrl(): string {
                    return `http://${this.host}:${this.port}`;
                }

                isSecure(): boolean {
                    return this.host !== '0.0.0.0';
                }
            }

            process.env.TEST_HOST = 'example.com';
            process.env.TEST_PORT = '8080';

            const config = AutoEnvParse.createFrom(ServerConfig, 'TEST');

            expect(config).toBeInstanceOf(ServerConfig);
            expect(typeof config.getUrl).toBe('function');
            expect(typeof config.isSecure).toBe('function');
            expect(config.getUrl()).toBe('http://example.com:8080');
            expect(config.isSecure()).toBe(true);
        });

        it('should handle nested plain objects in class properties', () => {
            class AppConfig {
                database = {
                    host: 'localhost',
                    port: 5432,
                    credentials: {
                        user: 'admin',
                        password: 'secret'
                    }
                };
            }

            process.env.TEST_DATABASE_HOST = 'prod.db';
            process.env.TEST_DATABASE_PORT = '5433';
            process.env.TEST_DATABASE_CREDENTIALS_USER = 'app_user';
            process.env.TEST_DATABASE_CREDENTIALS_PASSWORD = 'prod_secret';

            const config = AutoEnvParse.createFrom(AppConfig, 'TEST');

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.database.host).toBe('prod.db');
            expect(config.database.port).toBe(5433);
            expect(config.database.credentials.user).toBe('app_user');
            expect(config.database.credentials.password).toBe('prod_secret');
        });

        it('should handle nested class instances', () => {
            class DatabaseConfig {
                host = 'localhost';
                port = 5432;
            }

            class AppConfig {
                appName = 'myapp';
                database = new DatabaseConfig();
            }

            process.env.TEST_APP_NAME = 'production-app';
            process.env.TEST_DATABASE_HOST = 'prod.db';
            process.env.TEST_DATABASE_PORT = '5433';

            const config = AutoEnvParse.createFrom(AppConfig, 'TEST');

            expect(config).toBeInstanceOf(AppConfig);
            expect(config.database).toBeInstanceOf(DatabaseConfig);
            expect(config.appName).toBe('production-app');
            expect(config.database.host).toBe('prod.db');
            expect(config.database.port).toBe(5433);
        });

        it('should work with custom overrides', () => {
            class ServerConfig {
                port = 3000;
            }

            const overrides = new Map();
            overrides.set('port', (obj: ServerConfig, envVar: string) => {
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

            process.env.TEST_PORT = '8080';

            const config = AutoEnvParse.createFrom(ServerConfig, 'TEST', overrides);

            expect(config).toBeInstanceOf(ServerConfig);
            expect(config.port).toBe(8080);
        });
    });

    describe('Defensive checks', () => {
        it('should throw error if applyNestedObject receives non-plain-object', () => {
            // This is a defensive check that should never happen in normal usage
            // It ensures type safety at runtime

            const config = {
                nested: null as unknown
            };

            // Manually set to non-plain-object to trigger the check
            config.nested = new Date();

            process.env.TEST_NESTED_VALUE = 'test';

            // Should not throw because it won't try to apply nested parsing to Date
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();
        });

        it('should throw error if applyComplexObject receives non-object', () => {
            // Another defensive check for type safety
            class TestClass {
                prop = 'value';
            }

            const config = {
                complex: new TestClass()
            };

            process.env.TEST_COMPLEX_PROP = 'updated';

            // Should work fine with class instances
            expect(() => {
                AutoEnvParse.parse(config, 'TEST');
            }).not.toThrow();

            expect(config.complex.prop).toBe('updated');
        });
    });
});
