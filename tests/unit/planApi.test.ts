import { describe, expect, it, vi } from 'vitest';

import { buildIdeasContext } from '@/lib/ai/context';
import { buildFallbackIdeas } from '@/lib/ai/fallbackIdeas';
import { requestPlan } from '@/lib/client/planApi';
import type { PlanResponse } from '@/lib/domain/types';
import { buildPlan } from '@/lib/planner/buildPlan';

import { NOW, makeRequest } from './helpers';

const payload = makeRequest();

function realResponse(): PlanResponse {
  const plan = buildPlan(payload, NOW);
  return {
    plan,
    ideas: buildFallbackIdeas(buildIdeasContext(payload, plan)),
    ideasSource: 'fallback',
    generatedAt: NOW.toISOString(),
  };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, ...init }));

const fetcherReturning = (response: Promise<Response>) => vi.fn<typeof fetch>(() => response);

const signal = () => new AbortController().signal;

describe('requestPlan', () => {
  it('posts the payload as JSON to the plan endpoint', async () => {
    const fetcher = fetcherReturning(json(realResponse()));
    await requestPlan(payload, signal(), fetcher);

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('/api/plan');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual(payload);
  });

  it('returns the plan on success', async () => {
    const data = realResponse();
    const outcome = await requestPlan(payload, signal(), fetcherReturning(json(data)));
    expect(outcome).toEqual({ kind: 'success', data });
  });

  it('treats a 200 with an unexpected body as a failure rather than trusting it', async () => {
    for (const body of [{}, { plan: {}, ideas: {} }, [], null, 'text']) {
      const outcome = await requestPlan(payload, signal(), fetcherReturning(json(body)));
      expect(outcome.kind).toBe('failed');
    }
  });

  it('treats a 200 that is not JSON as a failure', async () => {
    const outcome = await requestPlan(
      payload,
      signal(),
      fetcherReturning(Promise.resolve(new Response('<html>', { status: 200 }))),
    );
    expect(outcome.kind).toBe('failed');
  });

  it('returns field errors for a 422, keeping only text messages', async () => {
    const fetcher = fetcherReturning(
      json(
        { error: { code: 'validation_failed', fieldErrors: { budget: 'Too small.', city: 5 } } },
        { status: 422 },
      ),
    );
    await expect(requestPlan(payload, signal(), fetcher)).resolves.toEqual({
      kind: 'invalid',
      fieldErrors: { budget: 'Too small.' },
    });
  });

  it('returns no field errors for a malformed 422 body', async () => {
    const outcome = await requestPlan(
      payload,
      signal(),
      fetcherReturning(json({ nope: true }, { status: 422 })),
    );
    expect(outcome).toEqual({ kind: 'invalid', fieldErrors: {} });
  });

  it('reads Retry-After from a 429, with a sensible default', async () => {
    const withHeader = fetcherReturning(
      json({}, { status: 429, headers: { 'Retry-After': '42' } }),
    );
    await expect(requestPlan(payload, signal(), withHeader)).resolves.toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: 42,
    });

    const unusable: Record<string, string>[] = [
      {},
      { 'Retry-After': 'soon' },
      { 'Retry-After': '-5' },
    ];
    for (const headers of unusable) {
      const outcome = await requestPlan(
        payload,
        signal(),
        fetcherReturning(json({}, { status: 429, headers })),
      );
      expect(outcome).toEqual({ kind: 'rate_limited', retryAfterSeconds: 30 });
    }
  });

  it.each([400, 403, 413, 415, 500, 503])(
    'returns a friendly failure for HTTP %i',
    async (status) => {
      const outcome = await requestPlan(
        payload,
        signal(),
        fetcherReturning(json({ error: { message: 'internal detail' } }, { status })),
      );
      expect(outcome.kind).toBe('failed');
      expect(JSON.stringify(outcome)).not.toContain('internal detail');
    },
  );

  it('returns a network message when the request cannot be made', async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch')));
    const outcome = await requestPlan(payload, signal(), fetcher);
    expect(outcome).toMatchObject({ kind: 'failed' });
    expect(outcome.kind === 'failed' && outcome.message).toMatch(/connection/i);
  });

  it('cancels the request when the caller aborts', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const pending = requestPlan(payload, controller.signal, fetcher);
    controller.abort();

    await expect(pending).resolves.toMatchObject({ kind: 'failed' });
  });
});
