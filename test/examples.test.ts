import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';

/**
 * Real-world usage examples demonstrating common configuration patterns.
 * These tests show how auto-envparse works with typical application configs.
 */
describe('AutoEnvParse - Real-world Examples', () => {
    // Store original env vars to restore after tests
    const originalEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
        // Save current env vars
        Object.keys(process.env)
            .filter(key => key.startsWith('DB_') || key.startsWith('APP_'))
            .forEach(key => {
                originalEnv[key] = process.env[key];
                delete process.env[key];
            });
    });

    afterEach(() => {
        // Restore original env vars
        Object.keys(process.env)
            .filter(key => key.startsWith('DB_') || key.startsWith('APP_'))
            .forEach(key => delete process.env[key]);

        Object.keys(originalEnv).forEach(key => {
            if (originalEnv[key] !== undefined) {
                process.env[key] = originalEnv[key];
            }
        });
    });

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

        AutoEnvParse.parse(dbConfig, { prefix: 'DB' });

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

        AutoEnvParse.parse(appConfig, { prefix: 'APP' });

        expect(appConfig.port).toBe(8080);
        expect(appConfig.debug).toBe(true);
        expect(appConfig.cors.origin).toBe('https://example.com');
        expect(appConfig.rateLimit.max).toBe(1000);
    });
});
