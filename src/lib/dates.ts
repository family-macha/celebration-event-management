/**
 * Calendar-date arithmetic on ISO `YYYY-MM-DD` strings.
 *
 * Everything is done in UTC so results never depend on the server's time zone
 * or on daylight-saving transitions.
 */

const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(isoDate: string): number {
  // `Date.parse` quietly rolls "2026-02-30" over to 2 March, so the round-trip
  // check in `isRealIsoDate` is what actually proves the date exists.
  if (!isRealIsoDate(isoDate)) {
    throw new RangeError(`Not a real ISO calendar date: ${isoDate}`);
  }
  return Date.parse(`${isoDate}T00:00:00Z`);
}

/** The UTC calendar date of an instant, as `YYYY-MM-DD`. */
export function toIsoDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/** Whole days from `fromIso` to `toIso` (negative if `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcMs(toIso) - toUtcMs(fromIso)) / MS_PER_DAY);
}

/** `isoDate` shifted by `days` (may be negative). */
export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtcMs(isoDate) + days * MS_PER_DAY));
}

/** True for a real calendar date such as `2026-02-28`, false for `2026-02-30`. */
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && toIsoDate(new Date(ms)) === value;
}
