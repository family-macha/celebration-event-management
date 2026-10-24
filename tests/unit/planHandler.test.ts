import { describe, expect, it, vi } from 'vitest';

import { buildFallbackIdeas } from '@/lib/ai/fallbackIdeas';
import { buildIdeasContext } from '@/lib/ai/context';
import { createIdeasService, type IdeasService } from '@/lib/ai/ideasService';
import type { PlanResponse } from '@/lib/domain/types';
import { ConfigError } from '@/lib/server/config';
import type { Logger } from '@/lib/server/logger';
import { MAX_BODY_BYTES, createPlanHandler, type PlanHandlerDeps } from '@/lib/server/planHandler';
import { createRateLimiter } from '@/lib/security/rateLimit';

import { NOW, inDays } from './helpers';

const validBody = () => ({
  eventType: 'birthday',
  eventDate: inDays(60),
  guestCount: 40,
  budget: 60_000,
  currency: 'INR',
  city: 'Ongole',
  priorities: ['food'],
  dietaryNeeds: ['vegetarian'],
});

function recordingLogger() {
  const entries: { level: string; event: string; fields: unknown }[] = [];
  const logger: Logger = {
    warn: (event, fields) => entries.push({ level: 'warn', event, fields }),
    error: (event, fields) => entries.push({ level: 'error', event, fields }),
  };
  return { logger, entries };
}

function setup(overrides: Partial<PlanHandlerDeps> = {}) {
  const { logger, entries } = recordingLogger();
  const getIdeas = vi.fn<IdeasService['getIdeas']>((request, plan) =>
    Promise.resolve({
      ideas: buildFallbackIdeas(buildIdeasContext(request, plan)),
      source: 'fallback' as const,
    }),
  );
  const ideas: IdeasService = { getIdeas };
  const deps: PlanHandlerDeps = {
    rateLimiter: createRateLimiter({ max: 100, windowMs: 60_000, now: () => NOW.getTime() }),
    ideas,
    logger,
    now: () => NOW,
    ...overrides,
  };
  return { handler: createPlanHandler(() => deps), deps, getIdeas, entries };
}

function call(
  handler: (request: Request) => Promise<Response>,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return handler(
    new Request('http://localhost/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/plan', () => {
  it('returns a complete plan with safe response headers', async () => {
    const { handler, getIdeas } = setup();
    const response = await call(handler, validBody());
    const body = (await response.json()) as PlanResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");

    expect(body.generatedAt).toBe(NOW.toISOString());
    expect(body.ideasSource).toBe('fallback');
    expect(body.plan.summary).toMatchObject({ eventType: 'birthday', guestCount: 40 });
    expect(body.plan.budgetLines.reduce((total, line) => total + line.amount, 0)).toBe(60_000);
    expect(body.ideas.menuSuggestions.length).toBeGreaterThan(0);
    expect(getIdeas).toHaveBeenCalledTimes(1);
  });

  it('works end to end with no API key, using the built-in ideas', async () => {
    const { logger } = recordingLogger();
    const real = createIdeasService({ generateText: null, timeoutMs: 1000, logger });
    const { handler } = setup({ ideas: real });

    const body = (await (await call(handler, validBody())).json()) as PlanResponse;
    expect(body.ideasSource).toBe('fallback');
    expect(body.ideas.headline).toContain('Ongole');
  });

  it('accepts a content type with parameters and any letter case', async () => {
    const { handler } = setup();
    for (const type of ['application/json; charset=utf-8', 'Application/JSON']) {
      const response = await call(handler, validBody(), { 'content-type': type });
      expect(response.status).toBe(200);
    }
  });

  it('answers 415 for anything that is not JSON', async () => {
    const { handler } = setup();
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
      const response = await call(handler, 'x=1', { 'content-type': type });
      expect(response.status).toBe(415);
    }
  });

  it('answers 415 when no content type is sent', async () => {
    const { handler } = setup();
    const response = await handler(
      new Request('http://localhost/api/plan', { method: 'POST', body: '{}' }),
    );
    // A string body is sent as text/plain by default, which is not accepted either.
    expect(response.status).toBe(415);
  });

  it('refuses requests that a page on another site triggered, before doing any other work', async () => {
    const check = vi.fn();
    const { handler, getIdeas } = setup({ rateLimiter: { check } });

    const response = await call(handler, validBody(), { 'sec-fetch-site': 'cross-site' });

    expect(response.status).toBe(403);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'forbidden_origin',
    );
    expect(check).not.toHaveBeenCalled();
    expect(getIdeas).not.toHaveBeenCalled();
  });

  it('allows same-origin, same-site and non-browser requests', async () => {
    const { handler } = setup();
    for (const site of ['same-origin', 'same-site', 'none']) {
      expect((await call(handler, validBody(), { 'sec-fetch-site': site })).status).toBe(200);
    }
    expect((await call(handler, validBody())).status).toBe(200);
  });

  describe('request size and shape', () => {
    it('answers 413 for an oversized body', async () => {
      const { handler } = setup();
      const response = await call(handler, { ...validBody(), vibe: 'x'.repeat(MAX_BODY_BYTES) });
      expect(response.status).toBe(413);
    });

    it('answers 400 for malformed JSON', async () => {
      const { handler } = setup();
      const response = await call(handler, '{"eventType":');
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        'invalid_json',
      );
    });

    it('answers 422 with a message for each wrong field, and never echoes the input back', async () => {
      const { handler, getIdeas } = setup();
      const response = await call(handler, {
        ...validBody(),
        guestCount: -5,
        budget: 'lots',
        city: '<script>steal()</script>',
      });
      const text = await response.text();
      const body = JSON.parse(text) as {
        error: { code: string; fieldErrors: Record<string, string> };
      };

      expect(response.status).toBe(422);
      expect(body.error.code).toBe('validation_failed');
      expect(Object.keys(body.error.fieldErrors).sort()).toEqual(['budget', 'city', 'guestCount']);
      expect(text).not.toContain('steal()');
      expect(getIdeas).not.toHaveBeenCalled();
    });

    it('answers 422 for fields it does not know', async () => {
      const { handler } = setup();
      const response = await call(handler, { ...validBody(), role: 'admin' });
      expect(response.status).toBe(422);
    });
  });

  describe('rate limiting', () => {
    it('answers 429 with Retry-After once a caller exceeds the limit, and only for that caller', async () => {
      const limiter = createRateLimiter({ max: 2, windowMs: 60_000, now: () => NOW.getTime() });
      const { handler } = setup({ rateLimiter: limiter });
      const ip = { 'x-real-ip': '203.0.113.5' };

      expect((await call(handler, validBody(), ip)).status).toBe(200);
      expect((await call(handler, validBody(), ip)).status).toBe(200);
      const blocked = await call(handler, validBody(), ip);

      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
      expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe(
        'rate_limited',
      );
      expect((await call(handler, validBody(), { 'x-real-ip': '203.0.113.6' })).status).toBe(200);
    });

    it('counts invalid requests too, so bad input cannot be used to hammer the server', async () => {
      const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => NOW.getTime() });
      const { handler } = setup({ rateLimiter: limiter });
      expect((await call(handler, 'not json')).status).toBe(400);
      expect((await call(handler, validBody())).status).toBe(429);
    });
  });

  describe('failures stay private', () => {
    it('answers a generic 500 and logs only the error category', async () => {
      const failing: IdeasService = {
        getIdeas: () => Promise.reject(new Error('secret-key-AIza123 leaked in message')),
      };
      const { handler, entries } = setup({ ideas: failing });

      const response = await call(handler, validBody());
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain('AIza123');
      expect(JSON.parse(text)).toEqual({
        error: {
          code: 'internal_error',
          message: 'Something went wrong on our side. Please try again.',
        },
      });
      expect(JSON.stringify(entries)).not.toContain('AIza123');
      expect(entries).toEqual([
        { level: 'error', event: 'request.unhandled', fields: { errorName: 'Error' } },
      ]);
    });

    it('does not reveal configuration problems to the client', async () => {
      const handler = createPlanHandler(() => {
        throw new ConfigError(['GEMINI_MODEL']);
      });
      const response = await call(handler, validBody());
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain('GEMINI');
    });

    it('survives a non-Error being thrown', async () => {
      const failing: IdeasService = {
        // Deliberately not an Error: the handler must cope with anything being thrown.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        getIdeas: () => Promise.reject('just a string'),
      };
      const { handler, entries } = setup({ ideas: failing });
      expect((await call(handler, validBody())).status).toBe(500);
      expect(entries[0]?.fields).toEqual({ errorName: 'string' });
    });
  });
});
