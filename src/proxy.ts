import { NextResponse, type NextRequest } from 'next/server';

import { buildContentSecurityPolicy, generateNonce } from '@/lib/security/headers';

/**
 * Runs before every page request: mints a fresh nonce and attaches the
 * Content-Security-Policy. Next.js reads the nonce from the request's CSP
 * header and stamps it on its own scripts and styles, so no inline code is
 * ever allowed without it. (This file is `proxy.ts`, the Next.js 16 name for
 * what earlier versions called middleware.)
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only. The API sets its own, stricter policy; static assets need none.
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
