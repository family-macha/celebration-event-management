import type { IdeasService } from '@/lib/ai/ideasService';
import type { PlanResponse } from '@/lib/domain/types';
import { readJsonBody } from '@/lib/http/body';
import { ApiError } from '@/lib/http/errors';
import { jsonResponse, toErrorResponse } from '@/lib/http/responses';
import { buildPlan } from '@/lib/planner/buildPlan';
import { getClientIp } from '@/lib/security/clientIp';
import type { RateLimiter } from '@/lib/security/rateLimit';
import { validatePlanRequest } from '@/lib/validation/planRequest';

import { consoleLogger, type Logger } from './logger';

/** A valid request is well under 1 KB; anything near this size is not a planning request. */
export const MAX_BODY_BYTES = 4096;

export interface PlanHandlerDeps {
  readonly rateLimiter: RateLimiter;
  readonly ideas: IdeasService;
  readonly logger: Logger;
  readonly now: () => Date;
}

/**
 * Builds the `POST /api/plan` handler.
 *
 * Dependencies are injected so every branch can be exercised in tests with
 * fakes (no network, no real clock). Cheap checks run first, so rejected
 * requests cost almost nothing: origin → rate limit → content type → body
 * size → JSON → schema → business logic.
 */
export function createPlanHandler(getDeps: () => PlanHandlerDeps) {
  return async function handlePlanRequest(request: Request): Promise<Response> {
    let logger: Logger | undefined;
    try {
      const deps = getDeps();
      logger = deps.logger;
      const now = deps.now();

      rejectCrossSiteRequests(request);

      const limit = deps.rateLimiter.check(getClientIp(request.headers));
      if (!limit.allowed) {
        throw new ApiError(
          429,
          'rate_limited',
          'Too many requests. Please wait a moment and try again.',
          undefined,
          { 'Retry-After': String(limit.retryAfterSeconds) },
        );
      }

      requireJson(request);
      const body = await readJsonBody(request, MAX_BODY_BYTES);

      const validation = validatePlanRequest(body, now);
      if (!validation.ok) {
        throw new ApiError(
          422,
          'validation_failed',
          'Some details need attention.',
          validation.fieldErrors,
        );
      }

      const plan = buildPlan(validation.value, now);
      const { ideas, source } = await deps.ideas.getIdeas(validation.value, plan);

      const payload: PlanResponse = {
        plan,
        ideas,
        ideasSource: source,
        generatedAt: now.toISOString(),
      };
      return jsonResponse(200, payload);
    } catch (error) {
      // If even building the dependencies failed there is no injected logger yet; use the default
      // so a broken deployment is visible in the logs instead of failing silently.
      return toErrorResponse(error, logger ?? consoleLogger);
    }
  };
}

/**
 * Browsers label every request with `Sec-Fetch-Site`. A request that a page on
 * another site triggered is refused outright (defence in depth on top of the
 * JSON-only content type, which already forces a CORS preflight). Non-browser
 * clients send no such header and are unaffected.
 */
function rejectCrossSiteRequests(request: Request): void {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError(403, 'forbidden_origin', 'Cross-site requests are not allowed.');
  }
}

function requireJson(request: Request): void {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new ApiError(415, 'unsupported_media_type', 'Send the request as application/json.');
  }
}
