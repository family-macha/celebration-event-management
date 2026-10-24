import { describe, expect, it } from 'vitest';

import { CURRENCIES, EVENT_TYPES } from '@/lib/domain/types';
import { PER_GUEST_REFERENCE } from '@/lib/planner/blueprints';
import { allocateBudget } from '@/lib/planner/budget';
import { assessFeasibility } from '@/lib/planner/feasibility';

function assess(
  eventType: (typeof EVENT_TYPES)[number],
  currency: (typeof CURRENCIES)[number],
  guestCount: number,
  budget: number,
  priorities: Parameters<typeof allocateBudget>[0]['priorities'] = [],
) {
  const { lines } = allocateBudget({ eventType, venueSetting: 'either', budget, priorities });
  return assessFeasibility({ eventType, guestCount, budget, currency, lines });
}

describe('assessFeasibility', () => {
  for (const currency of CURRENCIES) {
    for (const eventType of EVENT_TYPES) {
      const { lean, comfortable } = PER_GUEST_REFERENCE[currency][eventType];
      const guests = 80;

      it(`${currency} ${eventType}: thresholds at ${lean} and ${comfortable} per guest`, () => {
        expect(assess(eventType, currency, guests, comfortable * guests).level).toBe('comfortable');
        expect(assess(eventType, currency, guests, comfortable * guests - 1).level).toBe('tight');
        expect(assess(eventType, currency, guests, lean * guests).level).toBe('tight');
        expect(assess(eventType, currency, guests, lean * guests - 1).level).toBe('at_risk');
      });
    }
  }

  it('is calm and brief when the budget is comfortable', () => {
    const result = assess('wedding', 'INR', 100, 1_000_000);
    expect(result.level).toBe('comfortable');
    expect(result.perGuest).toBe(10_000);
    expect(result.advice.join(' ')).not.toMatch(/trim/i);
  });

  it('says how many guests, or how much money, would make a tight budget comfortable', () => {
    const result = assess('wedding', 'INR', 200, 500_000);
    expect(result.level).toBe('tight');
    expect(result.maxGuestsForComfortable).toBe(Math.floor(500_000 / 3500));
    expect(result.advice.join(' ')).toContain(String(result.maxGuestsForComfortable));
  });

  it('suggests a simpler format when the budget is below the minimum', () => {
    const result = assess('wedding', 'INR', 300, 150_000);
    expect(result.level).toBe('at_risk');
    expect(result.advice.join(' ')).toMatch(/simpler format/i);
  });

  it('suggests trimming only discretionary lines the host did not prioritise', () => {
    const plain = assess('wedding', 'INR', 300, 300_000);
    const trimAdvice = plain.advice.find((line) => line.startsWith('Where to trim first:'));
    expect(trimAdvice).toBeDefined();

    const prioritised = assess('wedding', 'INR', 300, 300_000, ['entertainment', 'decor']);
    const trimmed =
      prioritised.advice.find((line) => line.startsWith('Where to trim first:')) ?? '';
    expect(trimmed.toLowerCase()).not.toContain('entertainment');
    expect(trimmed.toLowerCase()).not.toContain('decor');
    expect(prioritised.advice.some((line) => line.startsWith('Protected because'))).toBe(true);
  });

  it('never reports fewer than one guest as comfortable', () => {
    expect(assess('wedding', 'INR', 1, 1).maxGuestsForComfortable).toBe(1);
  });
});
