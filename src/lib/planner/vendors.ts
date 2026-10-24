import type { BudgetLine, PlanRequest, VendorItem } from '@/lib/domain/types';

import {
  ACCESS_QUESTIONS,
  BLUEPRINTS,
  DIETARY_QUESTIONS,
  SETTING_QUESTIONS,
  type PlannedCategoryId,
} from './blueprints';
import { scheduleLead, type ScheduleContext } from './schedule';

type VendorInput = Pick<PlanRequest, 'eventType' | 'dietaryNeeds' | 'accessNeeds' | 'venueSetting'>;

/**
 * Builds the vendor checklist: one entry per bookable category, with its
 * budget, the date to book by, and the questions worth asking, extended by
 * the host's own context (dietary needs, access needs, indoor/outdoor).
 */
export function buildVendorChecklist(
  request: VendorInput,
  lines: readonly BudgetLine[],
  context: ScheduleContext,
): VendorItem[] {
  const amountById = new Map(lines.map((line) => [line.categoryId, line.amount]));

  const items: VendorItem[] = [];
  for (const category of BLUEPRINTS[request.eventType].categories) {
    const { vendor } = category;
    if (!vendor) continue;

    const scheduled = scheduleLead(vendor.leadDays, vendor.essential, context);
    items.push({
      categoryId: category.id,
      label: vendor.label,
      essential: vendor.essential,
      budget: amountById.get(category.id) ?? 0,
      bookBy: scheduled.dueDate,
      daysFromToday: scheduled.daysFromToday,
      status: scheduled.status,
      questions: [...new Set([...vendor.questions, ...contextQuestions(category.id, request)])],
    });
  }

  // Earliest deadline first; essential vendors win ties.
  return items.toSorted(
    (a, b) => a.bookBy.localeCompare(b.bookBy) || Number(b.essential) - Number(a.essential),
  );
}

function contextQuestions(categoryId: PlannedCategoryId, request: VendorInput): string[] {
  const questions: (string | undefined)[] = [
    ...request.dietaryNeeds.map((need) => DIETARY_QUESTIONS[need][categoryId]),
    ...request.accessNeeds.map((need) => ACCESS_QUESTIONS[need][categoryId]),
    SETTING_QUESTIONS[request.venueSetting][categoryId],
  ];
  return questions.filter((question): question is string => question !== undefined);
}
