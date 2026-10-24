import { addDays, toIsoDate } from '@/lib/dates';
import type { PlanRequest } from '@/lib/domain/types';

/** A fixed "now" so every test is reproducible. */
export const NOW = new Date('2026-10-22T09:30:00Z');
export const TODAY = toIsoDate(NOW);

/** The calendar date `days` after the fixed "today". */
export const inDays = (days: number): string => addDays(TODAY, days);

export function makeRequest(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    eventType: 'wedding',
    eventDate: inDays(300),
    guestCount: 150,
    budget: 1_000_000,
    currency: 'INR',
    venueSetting: 'either',
    priorities: [],
    dietaryNeeds: [],
    accessNeeds: [],
    ...overrides,
  };
}

/** Small deterministic PRNG (mulberry32): "random" test cases that never flake. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
