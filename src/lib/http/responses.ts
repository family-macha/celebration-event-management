import { API_CONTENT_SECURITY_POLICY } from '@/lib/security/headers';
import type { Logger } from '@/lib/server/logger';

import { ApiError } from './errors';

const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json; charset=utf-8',
  // Plans contain personal event details: never let a cache keep them.
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
};

export function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders?: Readonly<Record<string, string>>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

/** Maps any thrown value to a safe response. Internals never reach the client. */
export function toErrorResponse(error: unknown, logger: Logger): Response {
  if (error instanceof ApiError) {
    return jsonResponse(
      error.status,
      { error: { code: error.code, message: error.message, fieldErrors: error.details } },
      error.headers,
    );
  }

  // Log the category only: error messages can echo request data or secrets.
  logger.error('request.unhandled', {
    errorName: error instanceof Error ? error.name : typeof error,
  });
  return jsonResponse(500, {
    error: {
      code: 'internal_error',
      message: 'Something went wrong on our side. Please try again.',
    },
  });
}
