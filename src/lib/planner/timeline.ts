import { PHASES, type EventType, type TimelineTask, type VendorItem } from '@/lib/domain/types';
import { EVENT_LABEL } from '@/lib/format';

import { BLUEPRINTS, BOOKING_TASK_DESCRIPTION } from './blueprints';
import { scheduleLead, type ScheduleContext } from './schedule';

export interface Timeline {
  readonly tasks: readonly TimelineTask[];
  /** Explains any compression of the schedule; `null` when the standard plan fits. */
  readonly notice: string | null;
}

/**
 * Builds the dated task list: the event type's milestones plus one "book …"
 * task for every vendor in the checklist (so the two views always agree).
 */
export function buildTimeline(
  eventType: EventType,
  vendors: readonly VendorItem[],
  context: ScheduleContext,
): Timeline {
  const milestoneTasks: TimelineTask[] = BLUEPRINTS[eventType].milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    phase: milestone.phase,
    critical: milestone.critical,
    ...scheduleLead(milestone.leadDays, milestone.critical, context),
  }));

  const bookingTasks: TimelineTask[] = vendors.map((vendor) => ({
    id: `book-${vendor.categoryId}`,
    title: `Book: ${vendor.label}`,
    description: BOOKING_TASK_DESCRIPTION,
    phase: 'Booking',
    dueDate: vendor.bookBy,
    daysFromToday: vendor.daysFromToday,
    critical: vendor.essential,
    status: vendor.status,
  }));

  const tasks = [...milestoneTasks, ...bookingTasks].toSorted(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) || PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase),
  );

  return { tasks, notice: compressionNotice(eventType, tasks, context) };
}

function compressionNotice(
  eventType: EventType,
  tasks: readonly TimelineTask[],
  context: ScheduleContext,
): string | null {
  if (context.daysUntilEvent >= context.horizonDays) return null;

  const urgent = tasks.filter((task) => task.status === 'urgent').length;
  const days = context.daysUntilEvent;
  const intro = `Only ${days} day${days === 1 ? '' : 's'} remain; a typical ${EVENT_LABEL[eventType]} plan starts about ${context.horizonDays} days ahead. Dates have been shortened to fit.`;

  return urgent > 0
    ? `${intro} ${urgent} critical task${urgent === 1 ? ' is' : 's are'} marked urgent: start with those, and expect fewer vendor options.`
    : intro;
}
