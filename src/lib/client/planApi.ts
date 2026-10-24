import type { PlanRequest, PlanResponse } from '@/lib/domain/types';
import type { FieldErrors } from '@/lib/validation/planRequest';

/** Every way a request can end, as data: callers never need try/catch. */
export type PlanOutcome =
  | { readonly kind: 'success'; readonly data: PlanResponse }
  | { readonly kind: 'invalid'; readonly fieldErrors: FieldErrors }
  | { readonly kind: 'rate_limited'; readonly retryAfterSeconds: number }
  | { readonly kind: 'failed'; readonly message: string };

/** Longer than the server's Gemini timeout, so the server's fallback wins the race. */
const REQUEST_TIMEOUT_MS = 25_000;

const NETWORK_MESSAGE = 'We could not reach the planner. Check your connection and try again.';
const GENERIC_MESSAGE = 'Something went wrong while building your plan. Please try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlanResponse(value: unknown): value is PlanResponse {
  return (
    isRecord(value) &&
    isRecord(value.plan) &&
    isRecord(value.ideas) &&
    (value.ideasSource === 'gemini' || value.ideasSource === 'fallback')
  );
}

function readFieldErrors(body: unknown): FieldErrors {
  if (!isRecord(body) || !isRecord(body.error) || !isRecord(body.error.fieldErrors)) return {};
  return Object.fromEntries(
    Object.entries(body.error.fieldErrors).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export async function requestPlan(
  payload: PlanRequest,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<PlanOutcome> {
  let response: Response;
  try {
    response = await fetcher('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
  } catch {
    return { kind: 'failed', message: NETWORK_MESSAGE };
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return isPlanResponse(body)
      ? { kind: 'success', data: body }
      : { kind: 'failed', message: GENERIC_MESSAGE };
  }
  if (response.status === 422) {
    return { kind: 'invalid', fieldErrors: readFieldErrors(body) };
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    return {
      kind: 'rate_limited',
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30,
    };
  }
  return { kind: 'failed', message: GENERIC_MESSAGE };
}
