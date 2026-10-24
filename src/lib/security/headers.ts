/**
 * Security headers. Kept free of framework imports so `next.config.ts`, the
 * proxy, the API layer and the tests all share one definition.
 */

export interface HeaderEntry {
  readonly key: string;
  readonly value: string;
}

/** Sent on every response. */
export const STATIC_SECURITY_HEADERS: readonly HeaderEntry[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** JSON API responses load no sub-resources at all. */
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";

interface CspOptions {
  readonly nonce: string;
  readonly isDev: boolean;
}

/**
 * Nonce-based Content Security Policy for HTML pages.
 *
 * Scripts run only if they carry this request's unguessable nonce
 * (`strict-dynamic` lets those scripts load their own chunks), so injected
 * markup cannot execute. There is no `unsafe-inline` for scripts in
 * production. The app talks only to its own origin: Gemini is called from the
 * server, never from the browser.
 */
export function buildContentSecurityPolicy({ nonce, isDev }: CspOptions): string {
  const directives = [
    "default-src 'self'",
    // React's development tooling needs eval; production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];
  return directives.join('; ');
}

/** 128 bits from the platform CSPRNG, base64-encoded. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
