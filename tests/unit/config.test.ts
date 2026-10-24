import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '@/lib/server/config';

describe('loadConfig', () => {
  it('uses safe defaults and runs without an API key', () => {
    expect(loadConfig({})).toEqual({
      geminiApiKey: undefined,
      geminiModel: 'gemini-3.8-flash',
      geminiTimeoutMs: 12_000,
      rateLimitMax: 10,
      rateLimitWindowMs: 60_000,
    });
  });

  it('reads and trims explicit values', () => {
    const config = loadConfig({
      GEMINI_API_KEY: '  key-123  ',
      GEMINI_MODEL: 'gemini-2.5-pro',
      GEMINI_TIMEOUT_MS: '5000',
      RATE_LIMIT_MAX: '3',
      RATE_LIMIT_WINDOW_MS: '120000',
    });
    expect(config).toEqual({
      geminiApiKey: 'key-123',
      geminiModel: 'gemini-2.5-pro',
      geminiTimeoutMs: 5000,
      rateLimitMax: 3,
      rateLimitWindowMs: 120_000,
    });
  });

  it('treats empty and whitespace-only values as unset, as copied from .env.example', () => {
    const config = loadConfig({ GEMINI_API_KEY: '', GEMINI_MODEL: '   ', RATE_LIMIT_MAX: '' });
    expect(config.geminiApiKey).toBeUndefined();
    expect(config.geminiModel).toBe('gemini-3.8-flash');
    expect(config.rateLimitMax).toBe(10);
  });

  it.each([
    ['GEMINI_MODEL', 'not-a-model'],
    ['GEMINI_MODEL', 'gemini-../../etc'],
    ['GEMINI_MODEL', 'gemini-x y'],
    ['GEMINI_TIMEOUT_MS', '10'],
    ['GEMINI_TIMEOUT_MS', '999999'],
    ['GEMINI_TIMEOUT_MS', 'soon'],
    ['RATE_LIMIT_MAX', '0'],
    ['RATE_LIMIT_MAX', '1.5'],
    ['RATE_LIMIT_MAX', '100000'],
    ['RATE_LIMIT_WINDOW_MS', '5'],
  ])('rejects an invalid %s (%s)', (key, value) => {
    expect(() => loadConfig({ [key]: value })).toThrow(ConfigError);
  });

  it('names the bad settings in the error but never their values', () => {
    try {
      loadConfig({
        GEMINI_API_KEY: 'super-secret-key',
        GEMINI_MODEL: 'bad model name',
        RATE_LIMIT_MAX: 'many',
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const { message, invalidKeys } = error as ConfigError;
      expect([...invalidKeys].sort()).toEqual(['GEMINI_MODEL', 'RATE_LIMIT_MAX']);
      expect(message).toContain('GEMINI_MODEL');
      expect(message).not.toContain('super-secret-key');
      expect(message).not.toContain('bad model name');
    }
  });
});
