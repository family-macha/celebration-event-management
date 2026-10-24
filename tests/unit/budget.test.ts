import { describe, expect, it } from 'vitest';

import { EVENT_TYPES, PRIORITIES, VENUE_SETTINGS } from '@/lib/domain/types';
import {
  BLUEPRINTS,
  CONTINGENCY_RATE,
  OUTDOOR_CONTINGENCY_RATE,
  applicablePriorities,
} from '@/lib/planner/blueprints';
import { allocateBudget, apportion, contingencyRateFor } from '@/lib/planner/budget';

import { createRandom } from './helpers';

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

describe('apportion', () => {
  it('always returns whole numbers that add up to exactly the total', () => {
    const random = createRandom(42);
    for (let run = 0; run < 3000; run += 1) {
      const length = 1 + Math.floor(random() * 12);
      const weights = Array.from({ length }, () => 0.01 + random() * 10);
      const total = Math.floor(random() * 2_000_000_000);

      const parts = apportion(weights, total);

      expect(parts).toHaveLength(length);
      expect(parts.every((part) => Number.isInteger(part) && part >= 0)).toBe(true);
      expect(sum(parts)).toBe(total);
    }
  });

  it('keeps every part within one unit of its exact proportional share', () => {
    const weights = [3, 1, 4, 1, 5, 9, 2, 6];
    const total = 1_000_003;
    const weightSum = sum(weights);

    apportion(weights, total).forEach((part, index) => {
      const exact = ((weights[index] ?? 0) / weightSum) * total;
      expect(Math.abs(part - exact)).toBeLessThan(1);
    });
  });

  it('gives leftover units to the largest remainders, ties going to the earlier line', () => {
    expect(apportion([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(apportion([1, 1, 1], 100)).toEqual([34, 33, 33]);
    expect(apportion([1, 1], 3)).toEqual([2, 1]);
  });

  it('handles a zero total and a single line', () => {
    expect(apportion([2, 3, 5], 0)).toEqual([0, 0, 0]);
    expect(apportion([7], 123)).toEqual([123]);
  });

  it('is deterministic', () => {
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
    expect(apportion(weights, 987_654)).toEqual(apportion(weights, 987_654));
  });

  it.each([
    ['no weights', [], 10],
    ['a negative weight', [1, -1], 10],
    ['weights summing to zero', [0, 0], 10],
    ['a fractional total', [1, 1], 10.5],
    ['a negative total', [1, 1], -1],
    ['an unsafe total', [1, 1], Number.MAX_SAFE_INTEGER + 2],
  ] as const)('rejects %s', (_label, weights, total) => {
    expect(() => apportion(weights, total)).toThrow(RangeError);
  });
});

describe('allocateBudget', () => {
  const budgets = [1, 7, 99, 100_001, 999_999_937];

  for (const eventType of EVENT_TYPES) {
    for (const venueSetting of VENUE_SETTINGS) {
      it(`${eventType} / ${venueSetting}: lines sum exactly to the budget for awkward totals`, () => {
        for (const budget of budgets) {
          const { lines } = allocateBudget({ eventType, venueSetting, budget, priorities: [] });

          expect(sum(lines.map((line) => line.amount))).toBe(budget);
          expect(lines).toHaveLength(BLUEPRINTS[eventType].categories.length + 1);
          expect(lines.at(-1)?.categoryId).toBe('contingency');
          expect(lines.every((line) => Number.isInteger(line.amount) && line.amount >= 0)).toBe(
            true,
          );
        }
      });
    }
  }

  it('reserves a larger contingency outdoors', () => {
    expect(contingencyRateFor('indoor')).toBe(CONTINGENCY_RATE);
    expect(contingencyRateFor('either')).toBe(CONTINGENCY_RATE);
    expect(contingencyRateFor('outdoor')).toBe(OUTDOOR_CONTINGENCY_RATE);
    expect(OUTDOOR_CONTINGENCY_RATE).toBeGreaterThan(CONTINGENCY_RATE);

    const budget = 1_000_000;
    for (const venueSetting of VENUE_SETTINGS) {
      const { lines, contingencyRate } = allocateBudget({
        eventType: 'wedding',
        venueSetting,
        budget,
        priorities: [],
      });
      const reserve = lines.at(-1)?.amount ?? 0;
      expect(contingencyRate).toBe(contingencyRateFor(venueSetting));
      expect(Math.abs(reserve - budget * contingencyRate)).toBeLessThanOrEqual(1);
    }
  });

  it('gives a prioritised category a bigger share and leaves the reserve alone', () => {
    const base = { eventType: 'wedding', venueSetting: 'either', budget: 1_000_000 } as const;
    const plain = allocateBudget({ ...base, priorities: [] });
    const boosted = allocateBudget({ ...base, priorities: ['food'] });

    const plainCatering = plain.lines.find((line) => line.categoryId === 'catering');
    const boostedCatering = boosted.lines.find((line) => line.categoryId === 'catering');

    expect(plainCatering?.boosted).toBe(false);
    expect(boostedCatering?.boosted).toBe(true);
    expect(boostedCatering?.amount).toBeGreaterThan(plainCatering?.amount ?? Infinity);
    expect(Math.abs((boosted.lines.at(-1)?.amount ?? 0) - (plain.lines.at(-1)?.amount ?? 0))).toBe(
      0,
    );
    // Everything that was not boosted gives up a little to pay for it.
    for (const line of boosted.lines) {
      if (line.boosted || line.categoryId === 'contingency') continue;
      const before = plain.lines.find((candidate) => candidate.categoryId === line.categoryId);
      expect(line.amount).toBeLessThanOrEqual(before?.amount ?? 0);
    }
  });

  it('ignores priorities that do not apply to the event type', () => {
    for (const eventType of EVENT_TYPES) {
      const allowed = applicablePriorities(eventType);
      const notApplicable = PRIORITIES.filter((priority) => !allowed.includes(priority));
      const { lines } = allocateBudget({
        eventType,
        venueSetting: 'either',
        budget: 500_000,
        priorities: notApplicable,
      });
      expect(lines.some((line) => line.boosted)).toBe(false);
    }
  });

  it('reports shares to one decimal place', () => {
    const { lines } = allocateBudget({
      eventType: 'birthday',
      venueSetting: 'indoor',
      budget: 123_457,
      priorities: [],
    });
    for (const line of lines) {
      expect(Math.round(line.sharePercent * 10)).toBeCloseTo(line.sharePercent * 10, 6);
    }
    expect(sum(lines.map((line) => line.sharePercent))).toBeCloseTo(100, 0);
  });

  it('blueprint weights sum to one for every event type', () => {
    for (const eventType of EVENT_TYPES) {
      const total = sum(BLUEPRINTS[eventType].categories.map((category) => category.weight));
      expect(total).toBeCloseTo(1, 10);
    }
  });
});
