import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOW, inDays, makeRequest } from './helpers';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('GEMINI_MODEL', '');
  vi.stubEnv('RATE_LIMIT_MAX', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadContainer() {
  return import('@/lib/server/container');
}

describe('getPlanHandlerDeps', () => {
  it('wires production dependencies without needing any secret', async () => {
    const { getPlanHandlerDeps } = await loadContainer();
    const deps = getPlanHandlerDeps();

    const request = makeRequest({ eventDate: inDays(90) });
    const { buildPlan } = await import('@/lib/planner/buildPlan');
    const result = await deps.ideas.getIdeas(request, buildPlan(request, NOW));

    expect(result.source).toBe('fallback');
    expect(deps.now()).toBeInstanceOf(Date);
    expect(deps.rateLimiter.check('x').allowed).toBe(true);
  });

  it('creates the dependencies once and reuses them', async () => {
    const { getPlanHandlerDeps } = await loadContainer();
    expect(getPlanHandlerDeps()).toBe(getPlanHandlerDeps());
  });

  it('honours the configured rate limit', async () => {
    vi.stubEnv('RATE_LIMIT_MAX', '1');
    const { getPlanHandlerDeps } = await loadContainer();
    const { rateLimiter } = getPlanHandlerDeps();
    expect(rateLimiter.check('k').allowed).toBe(true);
    expect(rateLimiter.check('k').allowed).toBe(false);
  });

  it('builds a Gemini-backed service when a key is present', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const { getPlanHandlerDeps } = await loadContainer();
    expect(() => getPlanHandlerDeps()).not.toThrow();
  });

  it('fails loudly on invalid configuration', async () => {
    vi.stubEnv('GEMINI_MODEL', 'not-valid');
    const { getPlanHandlerDeps } = await loadContainer();
    // Resetting modules gives a fresh copy of the class, so load it from the same registry.
    const { ConfigError } = await import('@/lib/server/config');
    expect(() => getPlanHandlerDeps()).toThrow(ConfigError);
  });
});
