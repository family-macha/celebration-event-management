import { describe, expect, it } from 'vitest';

import { getClientIp } from '@/lib/security/clientIp';

const headers = (init: Record<string, string>) => new Headers(init);

describe('getClientIp', () => {
  it('prefers x-real-ip', () => {
    expect(
      getClientIp(headers({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '198.51.100.1' })),
    ).toBe('203.0.113.9');
  });

  it('uses the first x-forwarded-for entry', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': ' 198.51.100.7 , 10.0.0.1' }))).toBe(
      '198.51.100.7',
    );
  });

  it('accepts IPv6', () => {
    expect(getClientIp(headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it.each(['not-an-ip', '999.1.1.1', '1.2.3', "1.1.1.1'; DROP", '<script>', ''])(
    'ignores a malformed address (%j) so it cannot pollute the limiter',
    (value) => {
      expect(getClientIp(headers({ 'x-real-ip': value }))).toBe('unknown');
    },
  );

  it('falls back to a shared bucket when there is no usable header', () => {
    expect(getClientIp(headers({}))).toBe('unknown');
  });

  it('falls through to the next header when the first is invalid', () => {
    expect(getClientIp(headers({ 'x-real-ip': 'junk', 'x-forwarded-for': '192.0.2.4' }))).toBe(
      '192.0.2.4',
    );
  });
});
