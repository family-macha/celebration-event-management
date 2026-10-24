import type {
  AccessNeed,
  Currency,
  DietaryNeed,
  EventType,
  FeasibilityLevel,
  Plan,
  PlanRequest,
  Priority,
  VenueSetting,
} from '@/lib/domain/types';
import { LIMITS } from '@/lib/domain/types';
import { sanitizeFreeText } from '@/lib/security/sanitize';

/**
 * Everything the ideas step is allowed to know about an event: structured
 * facts plus two sanitised free-text fields. The model never sees raw input.
 */
export interface IdeasContext {
  readonly eventType: EventType;
  readonly guestCount: number;
  readonly venueSetting: VenueSetting;
  readonly daysUntilEvent: number;
  readonly currency: Currency;
  readonly feasibility: FeasibilityLevel;
  readonly city: string | undefined;
  readonly vibe: string | undefined;
  readonly priorities: readonly Priority[];
  readonly dietaryNeeds: readonly DietaryNeed[];
  readonly accessNeeds: readonly AccessNeed[];
  readonly budgetSplit: readonly { readonly category: string; readonly amount: number }[];
}

export function buildIdeasContext(request: PlanRequest, plan: Plan): IdeasContext {
  const city = request.city ? sanitizeFreeText(request.city, LIMITS.cityMaxLength) : '';
  const vibe = request.vibe ? sanitizeFreeText(request.vibe, LIMITS.vibeMaxLength) : '';

  return {
    eventType: request.eventType,
    guestCount: request.guestCount,
    venueSetting: request.venueSetting,
    daysUntilEvent: plan.summary.daysUntilEvent,
    currency: request.currency,
    feasibility: plan.feasibility.level,
    city: city || undefined,
    vibe: vibe || undefined,
    priorities: request.priorities,
    dietaryNeeds: request.dietaryNeeds,
    accessNeeds: request.accessNeeds,
    budgetSplit: plan.budgetLines.map((line) => ({ category: line.label, amount: line.amount })),
  };
}
