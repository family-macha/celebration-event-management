export type ApiErrorCode =
  | 'forbidden_origin'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_json'
  | 'validation_failed'
  | 'rate_limited'
  | 'internal_error';

/**
 * An error that is safe to show to API clients: its message is written for
 * people, never derived from internals. Anything that is *not* an `ApiError`
 * is reported to the client only as a generic `internal_error`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, string>>,
    readonly headers?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
