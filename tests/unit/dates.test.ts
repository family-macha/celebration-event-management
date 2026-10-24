import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, isRealIsoDate, toIsoDate } from '@/lib/dates';

describe('dates', () => {
  it('takes the UTC calendar date of an instant', () => {
    expect(toIsoDate(new Date('2026-10-22T23:59:59Z'))).toBe('2026-10-22');
    expect(toIsoDate(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23');
  });

  it('counts whole days, including across month, year and leap-day boundaries', () => {
    expect(daysBetween('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysBetween('2026-10-22', '2026-10-23')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
    expect(daysBetween('2026-10-22', '2026-10-20')).toBe(-2);
  });

  it('is not affected by daylight-saving changes', () => {
    // Clocks change in many zones around these dates; calendar arithmetic must not care.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('adds and subtracts days', () => {
    expect(addDays('2026-10-22', 10)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-22', 0)).toBe('2026-10-22');
  });

  it('is its own inverse', () => {
    for (const days of [-400, -1, 0, 1, 59, 366, 1095]) {
      expect(daysBetween('2026-10-22', addDays('2026-10-22', days))).toBe(days);
    }
  });

  it.each(['2026-02-30', '2026-13-01', '26-01-01', 'tomorrow', '2026-1-1', ''])(
    'refuses %j',
    (value) => {
      expect(() => daysBetween('2026-01-01', value)).toThrow(RangeError);
      expect(() => addDays(value, 1)).toThrow(RangeError);
    },
  );

  it('recognises real calendar dates only', () => {
    expect(isRealIsoDate('2028-02-29')).toBe(true);
    expect(isRealIsoDate('2027-02-29')).toBe(false);
    expect(isRealIsoDate('2026-04-31')).toBe(false);
    expect(isRealIsoDate('2026-12-31')).toBe(true);
    expect(isRealIsoDate('2026-12-31T00:00:00Z')).toBe(false);
    expect(isRealIsoDate(' 2026-12-31')).toBe(false);
  });
});
