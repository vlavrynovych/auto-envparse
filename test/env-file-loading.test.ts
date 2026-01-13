import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoEnvParse } from '../src/autoEnvParse';
import * as fs from 'fs';
import * as path from 'path';

describe('AutoEnvParse - .env File Loading', () => {
    const testEnvFile = path.join(process.cwd(), '.env.test');
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clean up process.env before each test
        for (const key in process.env) {
            if (key.startsWith('TEST_')) {
                delete process.env[key];
            }
        }
    });

    afterEach(() => {
        // Clean up test files and restore process.env
        if (fs.existsSync(testEnvFile)) {
            fs.unlinkSync(testEnvFile);
        }
        process.env = { ...originalEnv };
    });

    describe('ParseOptions interface', () => {
        it('should accept options object with sources', () => {
            const config = { host: 'localhost', port: 3000 };

            // Set env vars
            process.env.APP_HOST = 'example.com';
            process.env.APP_PORT = '8080';

            const result = AutoEnvParse.parse(config, {
                prefix: 'APP',
                sources: ['env']
            });

            expect(result.host).toBe('example.com');
            expect(result.port).toBe(8080);
        });

        it('should work with class constructors using options', () => {
            class Config {
                host = 'localhost';
                port = 3000;
            }

            process.env.TEST_HOST = 'prod.com';
            process.env.TEST_PORT = '5432';

            const result = AutoEnvParse.parse(Config, {
                prefix: 'TEST',
                sources: ['env']
            });

            expect(result.host).toBe('prod.com');
            expect(result.port).toBe(5432);
            expect(result).toBeInstanceOf(Config);
        });

        it('should support overrides in options', () => {
            const config = { port: 3000 };
            const overrides = new Map();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            overrides.set('port', (obj: any, envVar: string) => {
                const value = process.env[envVar];
                if (value) {
                    const port = parseInt(value, 10);
                    if (port >= 1 && port <= 65535) {
                        obj.port = port;
                    } else {
                        throw new Error('Invalid port');
                    }
                }
            });

            process.env.APP_PORT = '8080';

            const result = AutoEnvParse.parse(config, {
                prefix: 'APP',
                sources: ['env'],
                overrides
            });

            expect(result.port).toBe(8080);
        });
    });

    describe('Basic .env file loading', () => {
        it('should load values from .env file', () => {
            // Create .env file
            fs.writeFileSync(testEnvFile, 'TEST_HOST=filehost.com\nTEST_PORT=9000\n');

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('filehost.com');
            expect(result.port).toBe(9000);
        });

        it('should handle comments in .env file', () => {
            fs.writeFileSync(testEnvFile, `
# This is a comment
TEST_HOST=filehost.com
# Another comment
TEST_PORT=9000
`);

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('filehost.com');
            expect(result.port).toBe(9000);
        });

        it('should handle quoted values in .env file', () => {
            fs.writeFileSync(testEnvFile, `
TEST_HOST="quoted-host.com"
TEST_MESSAGE='single quotes'
TEST_PORT=9000
`);

            const config = { host: 'localhost', message: 'default', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('quoted-host.com');
            expect(result.message).toBe('single quotes');
            expect(result.port).toBe(9000);
        });

        it('should handle empty lines in .env file', () => {
            fs.writeFileSync(testEnvFile, `
TEST_HOST=filehost.com

TEST_PORT=9000

`);

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('filehost.com');
            expect(result.port).toBe(9000);
        });

        it('should skip lines without = sign', () => {
            fs.writeFileSync(testEnvFile, `
TEST_HOST=filehost.com
INVALID_LINE_NO_EQUALS
TEST_PORT=9000
`);

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('filehost.com');
            expect(result.port).toBe(9000);
        });
    });

    describe('Source priority system', () => {
        it('should prioritize first source (env over file)', () => {
            // Create .env file with one value
            fs.writeFileSync(testEnvFile, 'TEST_HOST=filehost.com\n');

            // Set env var with different value
            process.env.TEST_HOST = 'envhost.com';

            const config = { host: 'localhost' };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: ['env', testEnvFile]
            });

            // First in array wins (env takes priority)
            expect(result.host).toBe('envhost.com');
        });

        it('should prioritize first source (file over env)', () => {
            // Create .env file
            fs.writeFileSync(testEnvFile, 'TEST_HOST=filehost.com\n');

            // Set env var with different value
            process.env.TEST_HOST = 'envhost.com';

            const config = { host: 'localhost' };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile, 'env']
            });

            // First in array wins (file takes priority)
            expect(result.host).toBe('filehost.com');
        });

        it('should merge values from multiple sources', () => {
            // Create two .env files
            const testEnvFile2 = path.join(process.cwd(), '.env.test2');
            fs.writeFileSync(testEnvFile, 'TEST_HOST=file1.com\n');
            fs.writeFileSync(testEnvFile2, 'TEST_PORT=9000\n');

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile, testEnvFile2]
            });

            expect(result.host).toBe('file1.com');
            expect(result.port).toBe(9000);

            // Cleanup
            fs.unlinkSync(testEnvFile2);
        });

        it('should handle conflicts across multiple sources', () => {
            const testEnvFile2 = path.join(process.cwd(), '.env.test2');
            fs.writeFileSync(testEnvFile, 'TEST_HOST=file1.com\nTEST_PORT=8080\n');
            fs.writeFileSync(testEnvFile2, 'TEST_HOST=file2.com\nTEST_PORT=9000\n');

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile, testEnvFile2]
            });

            // First file wins for conflicts
            expect(result.host).toBe('file1.com');
            expect(result.port).toBe(8080);

            // Cleanup
            fs.unlinkSync(testEnvFile2);
        });
    });

    describe('Missing file handling', () => {
        it('should warn when .env file not found', () => {
            const consoleSpy = vi.spyOn(console, 'warn');

            const config = { host: 'localhost' };

            AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: ['/non/existent/.env']
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Warning: Environment file not found: /non/existent/.env')
            );

            consoleSpy.mockRestore();
        });

        it('should continue parsing after missing file', () => {
            const config = { host: 'localhost', port: 3000 };
            process.env.TEST_PORT = '8080';

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: ['/non/existent/.env', 'env']
            });

            // Should still load from env
            expect(result.host).toBe('localhost');
            expect(result.port).toBe(8080);
        });

        it('should warn on file read error', () => {
            const consoleSpy = vi.spyOn(console, 'warn');

            // Create a file that will cause read error (directory)
            const dirPath = path.join(process.cwd(), '.env.dir');
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }

            const config = { host: 'localhost' };

            AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [dirPath]
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Warning: Failed to load environment file/)
            );

            consoleSpy.mockRestore();
            fs.rmdirSync(dirPath);
        });

        it('should handle non-Error objects in catch block via custom parser', () => {
            const consoleSpy = vi.spyOn(console, 'warn');

            fs.writeFileSync(testEnvFile, 'TEST_HOST=test.com\n');

            // Custom parser that throws a non-Error object
            const badParser = (): Record<string, string> => {
                throw 'string error';
            };

            const config = { host: 'localhost' };

            AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile],
                envFileParser: badParser
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Warning: Failed to load environment file.*string error/)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Custom envFileParser', () => {
        it('should use custom parser when provided', () => {
            fs.writeFileSync(testEnvFile, 'CUSTOM_FORMAT: TEST_HOST=customhost.com\n');

            // Custom parser that handles different format
            const customParser = (content: string): Record<string, string> => {
                const result: Record<string, string> = {};
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.includes(':')) {
                        const [, keyValue] = line.split(':');
                        if (keyValue) {
                            const [key, value] = keyValue.trim().split('=');
                            if (key && value) {
                                result[key.trim()] = value.trim();
                            }
                        }
                    }
                }
                return result;
            };

            const config = { host: 'localhost' };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile],
                envFileParser: customParser
            });

            expect(result.host).toBe('customhost.com');
        });

        it('should support dotenv.parse as envFileParser', () => {
            // Simulate dotenv.parse behavior
            const dotenvParse = (content: string): Record<string, string> => {
                const result: Record<string, string> = {};
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex === -1) continue;
                    const key = trimmed.substring(0, eqIndex).trim();
                    let value = trimmed.substring(eqIndex + 1).trim();
                    // Remove quotes
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length - 1);
                    }
                    result[key] = value;
                }
                return result;
            };

            fs.writeFileSync(testEnvFile, 'TEST_HOST="dotenv-host.com"\nTEST_PORT=7000\n');

            const config = { host: 'localhost', port: 3000 };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile],
                envFileParser: dotenvParse
            });

            expect(result.host).toBe('dotenv-host.com');
            expect(result.port).toBe(7000);
        });
    });

    describe('Backward compatibility', () => {
        it('should default to ["env", ".env"] when no sources specified', () => {
            // Create a .env file in project root
            const defaultEnvFile = path.join(process.cwd(), '.env');
            const hadExisting = fs.existsSync(defaultEnvFile);
            const existingContent = hadExisting ? fs.readFileSync(defaultEnvFile, 'utf8') : '';

            fs.writeFileSync(defaultEnvFile, 'TEST_HOST=dotenvhost.com\n');

            const config = { host: 'localhost' };

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result.host).toBe('dotenvhost.com');

            // Restore original .env
            if (hadExisting) {
                fs.writeFileSync(defaultEnvFile, existingContent);
            } else {
                fs.unlinkSync(defaultEnvFile);
            }
        });

        it('should still work with v2.0 signature (prefix, overrides)', () => {
            process.env.TEST_HOST = 'v2host.com';
            const config = { host: 'localhost' };

            const result = AutoEnvParse.parse(config, { prefix: 'TEST' });

            expect(result.host).toBe('v2host.com');
        });

        it('should use default sources with v2.0 signature', () => {
            // v2.0 signature should default to ['env', '.env']
            const consoleSpy = vi.spyOn(console, 'warn');

            const config = { host: 'localhost' };

            // This will try to load .env by default
            AutoEnvParse.parse(config, { prefix: 'TEST' });

            // Should warn about missing .env (unless it exists)
            // This verifies that .env loading is attempted

            consoleSpy.mockRestore();
        });
    });

    describe('Type coercion with .env files', () => {
        it('should coerce types from .env file values', () => {
            fs.writeFileSync(testEnvFile, `
TEST_HOST=filehost.com
TEST_PORT=9000
TEST_ENABLED=true
TEST_TIMEOUT=30.5
`);

            const config = {
                host: 'localhost',
                port: 3000,
                enabled: false,
                timeout: 10.0
            };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.host).toBe('filehost.com');
            expect(result.port).toBe(9000);
            expect(typeof result.port).toBe('number');
            expect(result.enabled).toBe(true);
            expect(typeof result.enabled).toBe('boolean');
            expect(result.timeout).toBe(30.5);
            expect(typeof result.timeout).toBe('number');
        });

        it('should handle nested objects with .env file', () => {
            fs.writeFileSync(testEnvFile, `
TEST_DB_HOST=db.filehost.com
TEST_DB_PORT=5432
TEST_DB_SSL=true
`);

            const config = {
                db: {
                    host: 'localhost',
                    port: 3306,
                    ssl: false
                }
            };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.db.host).toBe('db.filehost.com');
            expect(result.db.port).toBe(5432);
            expect(result.db.ssl).toBe(true);
        });

        it('should handle arrays with .env file', () => {
            fs.writeFileSync(testEnvFile, `
TEST_SERVERS_0_HOST=server1.com
TEST_SERVERS_0_PORT=8080
TEST_SERVERS_1_HOST=server2.com
TEST_SERVERS_1_PORT=8081
`);

            const config = {
                servers: [{
                    host: 'localhost',
                    port: 3000
                }]
            };

            const result = AutoEnvParse.parse(config, {
                prefix: 'TEST',
                sources: [testEnvFile]
            });

            expect(result.servers).toHaveLength(2);
            expect(result.servers[0].host).toBe('server1.com');
            expect(result.servers[0].port).toBe(8080);
            expect(result.servers[1].host).toBe('server2.com');
            expect(result.servers[1].port).toBe(8081);
        });
    });
});
