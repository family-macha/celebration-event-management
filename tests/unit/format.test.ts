import { describe, expect, it } from 'vitest';

import { describeDaysFromToday, formatDate, formatMoney } from '@/lib/format';

describe('formatMoney', () => {
  it('uses each currency’s own grouping and symbol, with no decimals', () => {
    expect(formatMoney(150_000, 'INR')).toBe('₹1,50,000');
    expect(formatMoney(1_234_567, 'USD')).toBe('$1,234,567');
    expect(formatMoney(2_500, 'GBP')).toBe('£2,500');
    expect(formatMoney(0, 'USD')).toBe('$0');
    expect(formatMoney(99, 'EUR')).toContain('99');
    expect(formatMoney(99, 'EUR')).toContain('€');
  });

  it('is stable across repeated calls (cached formatters)', () => {
    expect(formatMoney(1000, 'INR')).toBe(formatMoney(1000, 'INR'));
  });
});

describe('formatDate', () => {
  it('formats an ISO date without drifting a day in any time zone', () => {
    expect(formatDate('2027-02-14')).toBe('Sun, 14 Feb 2027');
    expect(formatDate('2026-12-31')).toBe('Thu, 31 Dec 2026');
    expect(formatDate('2028-02-29')).toBe('Tue, 29 Feb 2028');
  });
});

describe('describeDaysFromToday', () => {
  it.each([
    [0, 'today'],
    [1, 'tomorrow'],
    [-1, 'yesterday'],
    [2, 'in 2 days'],
    [45, 'in 45 days'],
    [-9, '9 days ago'],
  ])('%i -> %s', (days, expected) => {
    expect(describeDaysFromToday(days)).toBe(expected);
  });
});
