import { addDays, daysBetween } from '@/lib/dates';
import type { EventType, TaskStatus } from '@/lib/domain/types';

import { planHorizonDays } from './blueprints';

export interface ScheduleContext {
  readonly eventDate: string;
  readonly today: string;
  readonly daysUntilEvent: number;
  /** How far ahead a standard plan for this event type begins. */
  readonly horizonDays: number;
}

export interface ScheduledDate {
  readonly dueDate: string;
  readonly daysFromToday: number;
  readonly status: TaskStatus;
}

export function createScheduleContext(
  eventType: EventType,
  eventDate: string,
  today: string,
): ScheduleContext {
  const daysUntilEvent = daysBetween(today, eventDate);
  if (daysUntilEvent < 0) {
    throw new RangeError('The event date is in the past.');
  }
  return { eventDate, today, daysUntilEvent, horizonDays: planHorizonDays(eventType) };
}

/**
 * Turns a standard lead time into a concrete date.
 *
 * - Zero or negative lead times (event day, follow-ups) are exact offsets.
 * - If there is enough time for a standard plan, dates are used as they are.
 * - If not, every lead time is scaled by `daysUntilEvent / horizonDays`.
 *   Scaling *all* tasks by the same factor keeps their order intact, so
 *   "book the venue" never ends up after "send the invitations".
 *
 * Independently of scaling, a task whose standard lead time exceeds the days
 * left is flagged: `urgent` if it is critical, otherwise `compressed`.
 */
export function scheduleLead(
  leadDays: number,
  critical: boolean,
  context: ScheduleContext,
): ScheduledDate {
  if (leadDays <= 0) {
    return {
      dueDate: addDays(context.eventDate, -leadDays),
      daysFromToday: context.daysUntilEvent - leadDays,
      status: 'on_track',
    };
  }

  const scaled =
    context.daysUntilEvent < context.horizonDays
      ? Math.max(1, Math.round((leadDays * context.daysUntilEvent) / context.horizonDays))
      : leadDays;
  const effectiveLead = Math.min(scaled, context.daysUntilEvent);

  const doesNotFit = leadDays > context.daysUntilEvent;
  const status: TaskStatus = doesNotFit ? (critical ? 'urgent' : 'compressed') : 'on_track';

  return {
    dueDate: addDays(context.eventDate, -effectiveLead),
    daysFromToday: context.daysUntilEvent - effectiveLead,
    status,
  };
}
