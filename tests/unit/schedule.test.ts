import { describe, expect, it } from 'vitest';

import { addDays, daysBetween } from '@/lib/dates';
import { createScheduleContext, scheduleLead, type ScheduleContext } from '@/lib/planner/schedule';

import { TODAY, inDays } from './helpers';

function context(daysUntilEvent: number, horizonDays = 270): ScheduleContext {
  return { eventDate: inDays(daysUntilEvent), today: TODAY, daysUntilEvent, horizonDays };
}

describe('createScheduleContext', () => {
  it('measures the days remaining and attaches the plan horizon', () => {
    const result = createScheduleContext('wedding', inDays(100), TODAY);
    expect(result.daysUntilEvent).toBe(100);
    expect(result.horizonDays).toBeGreaterThan(0);
    expect(result.today).toBe(TODAY);
  });

  it('accepts an event today but rejects one in the past', () => {
    expect(createScheduleContext('birthday', TODAY, TODAY).daysUntilEvent).toBe(0);
    expect(() => createScheduleContext('birthday', inDays(-1), TODAY)).toThrow(RangeError);
  });
});

describe('scheduleLead', () => {
  it('uses exact offsets for event-day and follow-up tasks', () => {
    const ctx = context(40);
    expect(scheduleLead(0, true, ctx)).toEqual({
      dueDate: ctx.eventDate,
      daysFromToday: 40,
      status: 'on_track',
    });
    expect(scheduleLead(-7, false, ctx)).toEqual({
      dueDate: addDays(ctx.eventDate, 7),
      daysFromToday: 47,
      status: 'on_track',
    });
  });

  it('keeps the standard lead time when there is enough time', () => {
    const ctx = context(300);
    const result = scheduleLead(120, true, ctx);
    expect(result.dueDate).toBe(addDays(ctx.eventDate, -120));
    expect(result.daysFromToday).toBe(180);
    expect(result.status).toBe('on_track');
  });

  it('shortens lead times proportionally when time is short', () => {
    const ctx = context(60);
    // 100 * 60 / 270 = 22.2 -> 22 days before the event.
    const result = scheduleLead(100, false, ctx);
    expect(result.dueDate).toBe(addDays(ctx.eventDate, -22));
    expect(result.daysFromToday).toBe(38);
  });

  it('marks a lead that cannot fit as urgent when critical, compressed otherwise', () => {
    const ctx = context(60);
    expect(scheduleLead(100, true, ctx).status).toBe('urgent');
    expect(scheduleLead(100, false, ctx).status).toBe('compressed');
  });

  it('does not flag a task that fits in the time remaining, even if dates were shortened', () => {
    const result = scheduleLead(30, true, context(60));
    expect(result.status).toBe('on_track');
  });

  it('never schedules anything before today, even with one day to go', () => {
    const ctx = context(1);
    for (const lead of [1, 5, 30, 120, 270]) {
      const result = scheduleLead(lead, true, ctx);
      expect(result.daysFromToday).toBeGreaterThanOrEqual(0);
      expect(daysBetween(TODAY, result.dueDate)).toBe(result.daysFromToday);
    }
  });

  it('preserves task order: a longer lead time is never scheduled later', () => {
    const leads = [1, 3, 7, 14, 30, 45, 60, 90, 120, 180, 270];
    for (let days = 1; days <= 400; days += 7) {
      const ctx = context(days);
      const dates = leads.map((lead) => scheduleLead(lead, false, ctx).daysFromToday);
      for (let index = 1; index < dates.length; index += 1) {
        expect(dates[index]!).toBeLessThanOrEqual(dates[index - 1]!);
      }
    }
  });
});
