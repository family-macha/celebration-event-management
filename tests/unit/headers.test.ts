import { describe, expect, it } from 'vitest';

import {
  API_CONTENT_SECURITY_POLICY,
  STATIC_SECURITY_HEADERS,
  buildContentSecurityPolicy,
  generateNonce,
} from '@/lib/security/headers';

function directive(policy: string, name: string): string[] {
  const found = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name);
  return found ? found.slice(1) : [];
}

describe('buildContentSecurityPolicy (production)', () => {
  const nonce = 'abc123==';
  const policy = buildContentSecurityPolicy({ nonce, isDev: false });

  it('allows scripts only with the request nonce, with no unsafe-inline or unsafe-eval', () => {
    const scripts = directive(policy, 'script-src');
    expect(scripts).toContain(`'nonce-${nonce}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('allows styles only with the nonce', () => {
    const styles = directive(policy, 'style-src');
    expect(styles).toContain(`'nonce-${nonce}'`);
    expect(styles).not.toContain("'unsafe-inline'");
  });

  it('locks everything else down', () => {
    expect(directive(policy, 'default-src')).toEqual(["'self'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'connect-src')).toEqual(["'self'"]);
    expect(policy).toContain('upgrade-insecure-requests');
  });

  it('never allows a wildcard or remote origin', () => {
    expect(policy).not.toMatch(/\*|https?:/);
  });
});

describe('buildContentSecurityPolicy (development)', () => {
  it('relaxes only what the dev tooling needs', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'n', isDev: true });
    expect(directive(policy, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(policy, 'style-src')).toContain("'unsafe-inline'");
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
  });
});

describe('generateNonce', () => {
  it('produces unique, unguessable base64 values with 128 bits of entropy', () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonces.size).toBe(200);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    }
  });
});

describe('static headers', () => {
  const byKey = new Map(STATIC_SECURITY_HEADERS.map((entry) => [entry.key, entry.value]));

  it('sets the standard hardening headers', () => {
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('X-Frame-Options')).toBe('DENY');
    expect(byKey.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(byKey.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(byKey.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(byKey.get('Strict-Transport-Security')).toMatch(/max-age=\d{8,}/);
  });

  it('denies powerful browser features the app never uses', () => {
    const policy = byKey.get('Permissions-Policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it('gives JSON responses a policy that loads nothing', () => {
    expect(API_CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(API_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });
});
