import { isIP } from 'node:net';

/**
 * Best-effort client address used only as a rate-limit key.
 *
 * Only well-formed IP addresses are accepted, so a hostile header cannot
 * inject arbitrary strings into the limiter's table. On platforms that
 * overwrite these headers (such as Vercel) the value is trustworthy; behind an
 * unknown proxy it can be spoofed, which is why the README recommends a
 * platform-level limit as well. Callers with no usable address share one bucket.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [headers.get('x-real-ip'), headers.get('x-forwarded-for')?.split(',')[0]];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value) !== 0) return value;
  }
  return 'unknown';
}
