import { afterEach, describe, expect, it, vi } from 'vitest';

import { consoleLogger } from '@/lib/server/logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('consoleLogger', () => {
  it('writes one JSON line per event with level, event, fields and a timestamp', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleLogger.warn('ideas.fallback', { reason: 'timeout', attempts: 1, retried: false });

    const line = JSON.parse(String(warn.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(line).toMatchObject({
      level: 'warn',
      event: 'ideas.fallback',
      reason: 'timeout',
      attempts: 1,
      retried: false,
    });
    expect(Number.isNaN(Date.parse(String(line.at)))).toBe(false);
  });

  it('sends errors to stderr and works without fields', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogger.error('request.unhandled');
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      event: 'request.unhandled',
    });
  });
});
