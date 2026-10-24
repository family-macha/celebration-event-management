import { describe, expect, it } from 'vitest';

import { createRateLimiter } from '@/lib/security/rateLimit';

function clock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows up to the limit and then blocks', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000, now: time.now });

    expect(limiter.check('a')).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    expect(limiter.check('a').remaining).toBe(1);
    expect(limiter.check('a').remaining).toBe(0);
    expect(limiter.check('a')).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('tells a blocked caller when the oldest request leaves the window', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, now: time.now });

    limiter.check('a');
    time.advance(20_000);
    limiter.check('a');
    time.advance(5_000);

    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(35);
  });

  it('slides: capacity returns as individual requests age out', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 2, windowMs: 10_000, now: time.now });

    limiter.check('a');
    time.advance(6_000);
    limiter.check('a');
    expect(limiter.check('a').allowed).toBe(false);

    time.advance(4_001); // first request is now older than the window
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });

  it('does not extend a block by counting rejected attempts', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 1, windowMs: 10_000, now: time.now });

    limiter.check('a');
    for (let attempt = 0; attempt < 50; attempt += 1) {
      time.advance(100);
      expect(limiter.check('a').allowed).toBe(false);
    }
    time.advance(5_001);
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('tracks callers independently', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: time.now });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });

  it('bounds memory: a flood of distinct callers evicts the oldest, not the newest', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, maxKeys: 3, now: time.now });

    for (const key of ['k1', 'k2', 'k3', 'k4', 'k5']) {
      limiter.check(key);
      time.advance(1);
    }
    // The newest callers are still remembered (blocked), the oldest were forgotten (allowed again).
    expect(limiter.check('k5').allowed).toBe(false);
    expect(limiter.check('k4').allowed).toBe(false);
    expect(limiter.check('k1').allowed).toBe(true);
  });

  it('first drops callers whose window has fully expired when over the cap', () => {
    const time = clock();
    const limiter = createRateLimiter({ max: 1, windowMs: 1_000, maxKeys: 2, now: time.now });

    limiter.check('old1');
    limiter.check('old2');
    time.advance(2_000);
    limiter.check('fresh1');
    limiter.check('fresh2');

    expect(limiter.check('fresh1').allowed).toBe(false);
    expect(limiter.check('fresh2').allowed).toBe(false);
  });

  it('uses the real clock by default', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check('x').allowed).toBe(true);
    expect(limiter.check('x').allowed).toBe(false);
  });
});
