import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanResponse } from '@/lib/domain/types';

import { inDays } from './helpers';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('GEMINI_MODEL', '');
  vi.stubEnv('RATE_LIMIT_MAX', '2');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const validBody = () => ({
  eventType: 'community',
  eventDate: inDays(90),
  guestCount: 80,
  budget: 40_000,
  currency: 'INR',
});

describe('app/api/plan route', () => {
  it('runs on Node and is never cached', async () => {
    const route = await import('@/app/api/plan/route');
    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('exposes POST only, so every other method is answered 405 by the framework', async () => {
    const route = (await import('@/app/api/plan/route')) as Record<string, unknown>;
    expect(typeof route.POST).toBe('function');
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      expect(route[method]).toBeUndefined();
    }
  });

  it('serves a real plan through the real wiring, with no API key configured', async () => {
    const { POST } = await import('@/app/api/plan/route');
    const response = await POST(post(validBody()));
    const body = (await response.json()) as PlanResponse;

    expect(response.status).toBe(200);
    expect(body.ideasSource).toBe('fallback');
    expect(body.plan.budgetLines.reduce((total, line) => total + line.amount, 0)).toBe(40_000);
  });

  it('applies the configured rate limit per client', async () => {
    const { POST } = await import('@/app/api/plan/route');
    const ip = { 'x-real-ip': '198.51.100.20' };

    expect((await POST(post(validBody(), ip))).status).toBe(200);
    expect((await POST(post(validBody(), ip))).status).toBe(200);
    expect((await POST(post(validBody(), ip))).status).toBe(429);
    expect((await POST(post(validBody(), { 'x-real-ip': '198.51.100.21' }))).status).toBe(200);
  });

  it('reports a bad configuration as a generic 500 without naming anything', async () => {
    vi.stubEnv('GEMINI_MODEL', 'bad model');
    const { POST } = await import('@/app/api/plan/route');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(post(validBody()));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toMatch(/GEMINI|model/i);
    // The operator is told which setting is wrong (a name, never a value); the client is not.
    const logged = errors.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('config.invalid');
    expect(logged).toContain('GEMINI_MODEL');
    expect(logged).not.toContain('bad model');
    errors.mockRestore();
  });
});
