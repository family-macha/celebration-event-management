import { describe, expect, it } from 'vitest';

import { LIMITS } from '@/lib/domain/types';
import { validatePlanRequest } from '@/lib/validation/planRequest';

import { NOW, inDays } from './helpers';

const valid = () => ({
  eventType: 'wedding',
  eventDate: inDays(100),
  guestCount: 120,
  budget: 800_000,
  currency: 'INR',
});

function errorsFor(input: unknown) {
  const result = validatePlanRequest(input, NOW);
  if (result.ok) throw new Error('Expected validation to fail');
  return result.fieldErrors;
}

describe('validatePlanRequest', () => {
  it('accepts a minimal request and fills in sensible defaults', () => {
    const result = validatePlanRequest(valid(), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      venueSetting: 'either',
      priorities: [],
      dietaryNeeds: [],
      accessNeeds: [],
    });
    expect(result.value.city).toBeUndefined();
    expect(result.value.vibe).toBeUndefined();
  });

  it('accepts a complete request', () => {
    const result = validatePlanRequest(
      {
        ...valid(),
        city: "St. John's, Newfoundland",
        venueSetting: 'outdoor',
        priorities: ['food', 'photography'],
        dietaryNeeds: ['vegan'],
        accessNeeds: ['step_free'],
        vibe: 'relaxed garden party',
      },
      NOW,
    );
    expect(result.ok).toBe(true);
  });

  it('reports every missing field with a message people can act on', () => {
    const errors = errorsFor({});
    expect(Object.keys(errors).sort()).toEqual(
      ['budget', 'currency', 'eventDate', 'eventType', 'guestCount'].sort(),
    );
    for (const message of Object.values(errors)) {
      expect(message).toMatch(/[.]$/);
      expect(message.length).toBeGreaterThan(10);
    }
  });

  it.each([null, undefined, 'text', 42, [], true])('rejects a non-object body: %s', (input) => {
    expect(validatePlanRequest(input, NOW).ok).toBe(false);
  });

  it('rejects unknown fields instead of silently ignoring them', () => {
    const errors = errorsFor({ ...valid(), isAdmin: true });
    expect(errors.form).toBeDefined();
  });

  describe('event date', () => {
    it.each([
      ['not a date', 'next friday'],
      ['an impossible day', '2027-02-30'],
      ['a non-leap 29 February', '2027-02-29'],
      ['month 13', '2027-13-01'],
      ['a different format', '14/02/2027'],
      ['a date-time', '2027-02-14T10:00:00Z'],
    ])('rejects %s', (_label, eventDate) => {
      expect(errorsFor({ ...valid(), eventDate }).eventDate).toMatch(/real date/);
    });

    it('accepts a real leap day', () => {
      const now = new Date('2027-12-01T00:00:00Z');
      const result = validatePlanRequest({ ...valid(), eventDate: '2028-02-29' }, now);
      expect(result.ok).toBe(true);
    });

    it('requires at least one day of notice, measured in UTC', () => {
      expect(validatePlanRequest({ ...valid(), eventDate: inDays(1) }, NOW).ok).toBe(true);
      expect(errorsFor({ ...valid(), eventDate: inDays(0) }).eventDate).toMatch(/after/);
      expect(errorsFor({ ...valid(), eventDate: inDays(-30) }).eventDate).toMatch(/after/);
    });

    it('limits how far ahead a plan can look', () => {
      expect(
        validatePlanRequest({ ...valid(), eventDate: inDays(LIMITS.maxDaysAhead) }, NOW).ok,
      ).toBe(true);
      expect(
        errorsFor({ ...valid(), eventDate: inDays(LIMITS.maxDaysAhead + 1) }).eventDate,
      ).toMatch(/three years/);
    });

    it('rejects a number or missing value', () => {
      expect(errorsFor({ ...valid(), eventDate: 20270214 }).eventDate).toBeDefined();
      expect(errorsFor({ ...valid(), eventDate: undefined }).eventDate).toMatch(/Choose the event/);
    });
  });

  describe('numbers', () => {
    it.each([
      ['a string', '100'],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a fraction', 10.5],
      ['zero', 0],
      ['negative', -3],
      ['above the limit', LIMITS.guestCount.max + 1],
    ])('rejects guestCount that is %s', (_label, guestCount) => {
      expect(errorsFor({ ...valid(), guestCount }).guestCount).toBeDefined();
    });

    it('accepts the guest count limits', () => {
      for (const guestCount of [LIMITS.guestCount.min, LIMITS.guestCount.max]) {
        expect(validatePlanRequest({ ...valid(), guestCount }, NOW).ok).toBe(true);
      }
    });

    it.each([
      ['a string', '500000'],
      ['a fraction', 99.99],
      ['zero', 0],
      ['negative', -1],
      ['above the limit', LIMITS.budget.max + 1],
    ])('rejects budget that is %s', (_label, budget) => {
      expect(errorsFor({ ...valid(), budget }).budget).toBeDefined();
    });
  });

  describe('choices', () => {
    it('rejects values outside the allowed lists', () => {
      expect(errorsFor({ ...valid(), eventType: 'funeral' }).eventType).toBeDefined();
      expect(errorsFor({ ...valid(), currency: 'JPY' }).currency).toBeDefined();
      expect(errorsFor({ ...valid(), venueSetting: 'underwater' }).venueSetting).toBeDefined();
      expect(errorsFor({ ...valid(), dietaryNeeds: ['paleo'] }).dietaryNeeds).toBeDefined();
      expect(errorsFor({ ...valid(), accessNeeds: ['jetpack'] }).accessNeeds).toBeDefined();
    });

    it('limits the number of priorities and removes duplicates', () => {
      expect(
        errorsFor({
          ...valid(),
          priorities: ['food', 'venue', 'photography', 'decor'],
        }).priorities,
      ).toMatch(/up to 3/);

      const result = validatePlanRequest(
        { ...valid(), priorities: ['food', 'food', 'venue'], dietaryNeeds: ['vegan', 'vegan'] },
        NOW,
      );
      expect(result.ok && result.value.priorities).toEqual(['food', 'venue']);
      expect(result.ok && result.value.dietaryNeeds).toEqual(['vegan']);
    });

    it('rejects priorities that mean nothing for this kind of event', () => {
      // Community events have no photographer or decorator; birthdays have no "guest comfort" line.
      expect(
        errorsFor({ ...valid(), eventType: 'community', priorities: ['photography'] }).priorities,
      ).toMatch(/do not apply/);
      expect(
        errorsFor({ ...valid(), eventType: 'birthday', priorities: ['guest_comfort'] }).priorities,
      ).toMatch(/do not apply/);
      expect(
        validatePlanRequest(
          { ...valid(), eventType: 'wedding', priorities: ['guest_comfort'] },
          NOW,
        ).ok,
      ).toBe(true);
    });

    it('rejects a non-array where a list is expected', () => {
      expect(errorsFor({ ...valid(), priorities: 'food' }).priorities).toMatch(/list/);
    });
  });

  describe('free text', () => {
    it('accepts international city names', () => {
      for (const city of ['Ongole', 'Zürich', 'São Paulo', '東京', 'Winston-Salem', "O'Fallon"]) {
        expect(validatePlanRequest({ ...valid(), city }, NOW).ok).toBe(true);
      }
    });

    it.each(['<script>alert(1)</script>', 'Paris; DROP TABLE', 'a'.repeat(81), 'City\nTwo'])(
      'rejects an unsafe or oversized city: %j',
      (city) => {
        expect(errorsFor({ ...valid(), city }).city).toBeDefined();
      },
    );

    it('cleans the vibe: strips markup delimiters and invisible characters, collapses space', () => {
      const result = validatePlanRequest(
        { ...valid(), vibe: '  cosy​ <b>garden</b>\n\n party‮  ' },
        NOW,
      );
      expect(result.ok && result.value.vibe).toBe('cosy b garden /b party');
    });

    it('turns a vibe of only whitespace or markup into "not provided"', () => {
      const result = validatePlanRequest({ ...valid(), vibe: ' <> \n ' }, NOW);
      expect(result.ok && result.value.vibe).toBeUndefined();
    });

    it('rejects an over-long vibe', () => {
      expect(errorsFor({ ...valid(), vibe: 'x'.repeat(LIMITS.vibeMaxLength + 1) }).vibe).toMatch(
        /under 280/,
      );
    });
  });

  it('does not let a prototype-pollution payload through', () => {
    const body = JSON.parse(
      '{"__proto__":{"polluted":true},"eventType":"wedding","eventDate":"2027-05-05","guestCount":10,"budget":1000,"currency":"INR"}',
    ) as unknown;
    const result = validatePlanRequest(body, NOW);
    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
