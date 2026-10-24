import type { Currency, EventType } from '@/lib/domain/types';

const CURRENCY_LOCALE: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
};

export const EVENT_LABEL: Record<EventType, string> = {
  wedding: 'wedding',
  birthday: 'birthday celebration',
  community: 'community event',
};

const moneyFormatters = new Map<Currency, Intl.NumberFormat>();

/** Formats whole currency units, e.g. `₹1,50,000`. Formatters are cached per currency. */
export function formatMoney(amount: number, currency: Currency): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats an ISO calendar date (`YYYY-MM-DD`) as e.g. `Sat, 14 Feb 2026`. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Human wording for a day offset from today. */
export function describeDaysFromToday(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}
