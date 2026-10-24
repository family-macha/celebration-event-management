import type { BudgetLine, CategoryId, Currency, EventType, Feasibility } from '@/lib/domain/types';
import { EVENT_LABEL, formatMoney } from '@/lib/format';

import { BLUEPRINTS, PER_GUEST_REFERENCE } from './blueprints';

interface FeasibilityInput {
  readonly eventType: EventType;
  readonly guestCount: number;
  readonly budget: number;
  readonly currency: Currency;
  readonly lines: readonly BudgetLine[];
}

/** How many discretionary lines to name when suggesting where to trim first. */
const TRIM_SUGGESTIONS = 2;

/**
 * Judges whether the budget realistically covers the guest count and, when it
 * does not, says what to change. The judgement is deliberately rule-based, not
 * generated, so the same inputs always give the same, explainable answer.
 */
export function assessFeasibility(input: FeasibilityInput): Feasibility {
  const { eventType, guestCount, budget, currency, lines } = input;
  const { lean, comfortable } = PER_GUEST_REFERENCE[currency][eventType];

  const perGuest = Math.floor(budget / guestCount);
  const maxGuestsForComfortable = Math.max(1, Math.floor(budget / comfortable));
  const level = perGuest >= comfortable ? 'comfortable' : perGuest >= lean ? 'tight' : 'at_risk';

  const money = (amount: number): string => formatMoney(amount, currency);
  const advice: string[] = [];

  if (level === 'comfortable') {
    advice.push(
      `At ${money(perGuest)} per guest you are above the ${money(comfortable)} we treat as comfortable for this kind of event.`,
      'Keep the contingency untouched until the final week; it is your safety net, not a spending pot.',
    );
  } else {
    if (level === 'tight') {
      advice.push(
        `At ${money(perGuest)} per guest the budget is workable but tight (about ${money(comfortable)} per guest is comfortable).`,
      );
    } else {
      advice.push(
        `At ${money(perGuest)} per guest the budget is below the ${money(lean)} we treat as the minimum for a simple ${EVENT_LABEL[eventType]}.`,
        'Consider a simpler format: a shorter event, daytime hours, or a shared-contribution menu.',
      );
    }
    advice.push(
      `To reach a comfortable level, keep the guest list near ${maxGuestsForComfortable} or raise the budget to about ${money(comfortable * guestCount)}.`,
    );

    const trimFirst = trimCandidates(eventType, lines);
    if (trimFirst.length > 0) {
      advice.push(`Where to trim first: ${trimFirst.join(' and ')}.`);
    }
  }

  const protectedLines = lines.filter((line) => line.boosted).map((line) => line.label);
  if (protectedLines.length > 0) {
    advice.push(`Protected because you prioritised them: ${protectedLines.join(', ')}.`);
  }

  return {
    level,
    perGuest,
    leanPerGuest: lean,
    comfortablePerGuest: comfortable,
    maxGuestsForComfortable,
    advice,
  };
}

/** Largest discretionary lines the host did not prioritise: the cheapest things to give up. */
function trimCandidates(eventType: EventType, lines: readonly BudgetLine[]): string[] {
  const discretionary = new Set<CategoryId>(
    BLUEPRINTS[eventType].categories.filter((c) => c.discretionary).map((c) => c.id),
  );
  return lines
    .filter((line) => !line.boosted && discretionary.has(line.categoryId))
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, TRIM_SUGGESTIONS)
    .map((line) => line.label.toLowerCase());
}
