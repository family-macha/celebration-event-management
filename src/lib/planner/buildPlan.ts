import { toIsoDate } from '@/lib/dates';
import type { Plan, PlanRequest } from '@/lib/domain/types';

import { allocateBudget } from './budget';
import { assessFeasibility } from './feasibility';
import { createScheduleContext } from './schedule';
import { buildTimeline } from './timeline';
import { buildVendorChecklist } from './vendors';

/**
 * Builds the complete deterministic plan for a validated request.
 *
 * Pure: no I/O, no clock access (the caller supplies `now`), no randomness.
 * Money and dates are never delegated to a language model, so the numbers a
 * host acts on are always exact and reproducible.
 */
export function buildPlan(request: PlanRequest, now: Date): Plan {
  const context = createScheduleContext(request.eventType, request.eventDate, toIsoDate(now));

  const { lines, contingencyRate } = allocateBudget(request);
  const feasibility = assessFeasibility({
    eventType: request.eventType,
    guestCount: request.guestCount,
    budget: request.budget,
    currency: request.currency,
    lines,
  });
  const vendors = buildVendorChecklist(request, lines, context);
  const timeline = buildTimeline(request.eventType, vendors, context);

  return {
    summary: {
      eventType: request.eventType,
      eventDate: request.eventDate,
      daysUntilEvent: context.daysUntilEvent,
      guestCount: request.guestCount,
      budget: request.budget,
      currency: request.currency,
      perGuest: feasibility.perGuest,
      venueSetting: request.venueSetting,
    },
    budgetLines: lines,
    contingencyRate,
    feasibility,
    timeline,
    vendors,
  };
}
