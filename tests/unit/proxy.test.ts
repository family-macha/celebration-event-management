import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from '@/proxy';

const run = () => proxy(new NextRequest('http://localhost/'));

function nonceOf(policy: string): string {
  const match = /'nonce-([^']+)'/.exec(policy);
  if (!match?.[1]) throw new Error('No nonce in policy');
  return match[1];
}

describe('proxy (per-request Content-Security-Policy)', () => {
  it('attaches a nonce-based policy to the response', () => {
    const policy = run().headers.get('content-security-policy') ?? '';
    expect(policy).toContain("script-src 'self' 'nonce-");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
  });

  it('forwards the same policy to the app on the request, which is how Next.js finds the nonce', () => {
    const response = run();
    const onResponse = response.headers.get('content-security-policy');
    const onRequest = response.headers.get('x-middleware-request-content-security-policy');

    expect(onRequest).toBe(onResponse);
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(onResponse ?? ''));
  });

  it('uses a fresh nonce for every request', () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => nonceOf(run().headers.get('content-security-policy') ?? '')),
    );
    expect(nonces.size).toBe(50);
  });

  it('applies to pages, not to the API, build assets or the favicon', () => {
    const { source } = config.matcher[0]!;
    const pattern = new RegExp(`^${source.replace(/^\//, '/')}$`);

    expect(pattern.test('/')).toBe(true);
    expect(pattern.test('/some/page')).toBe(true);
    expect(pattern.test('/api/plan')).toBe(false);
    expect(pattern.test('/_next/static/chunks/app.js')).toBe(false);
    expect(pattern.test('/_next/image')).toBe(false);
    expect(pattern.test('/favicon.ico')).toBe(false);
  });

  it('skips prefetches, which never render a document', () => {
    const { missing } = config.matcher[0]!;
    expect(missing).toEqual(
      expect.arrayContaining([
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ]),
    );
  });
});
