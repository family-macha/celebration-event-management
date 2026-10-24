export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  /** Seconds until a blocked caller may try again; 0 when allowed. */
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface RateLimiterOptions {
  readonly max: number;
  readonly windowMs: number;
  /** Cap on tracked keys, so a flood of distinct callers cannot exhaust memory. */
  readonly maxKeys?: number;
  /** Injected clock (milliseconds) for deterministic tests. */
  readonly now?: () => number;
}

const DEFAULT_MAX_KEYS = 10_000;

/**
 * In-memory sliding-window limiter.
 *
 * Each key keeps at most `max` timestamps, and the table of keys is bounded,
 * so memory use is O(max × maxKeys) whatever traffic arrives.
 *
 * Limitation (documented in the README): state is per server instance. On a
 * multi-instance deployment put a shared limiter (an edge or WAF rule, or a
 * Redis-backed store) in front; this one is a safety net, not the only gate.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { max, windowMs } = options;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  function evictIfNeeded(cutoff: number): void {
    if (hits.size <= maxKeys) return;

    // First drop callers whose window has fully expired…
    for (const [key, stamps] of hits) {
      if ((stamps.at(-1) ?? 0) <= cutoff) hits.delete(key);
    }
    // …then, if still over the cap, the least recently used.
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) break;
      hits.delete(key);
    }
  }

  return {
    check(key) {
      const current = now();
      const cutoff = current - windowMs;
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);

      if (recent.length >= max) {
        const oldest = recent[0] ?? current;
        hits.delete(key);
        hits.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - current) / 1000)),
        };
      }

      recent.push(current);
      // Re-insert so Map order tracks recency (least recently used first).
      hits.delete(key);
      hits.set(key, recent);
      evictIfNeeded(cutoff);

      return { allowed: true, remaining: max - recent.length, retryAfterSeconds: 0 };
    },
  };
}
