import type { BudgetLine, PlanRequest, VenueSetting } from '@/lib/domain/types';

import {
  BLUEPRINTS,
  CONTINGENCY_LABEL,
  CONTINGENCY_RATE,
  OUTDOOR_CONTINGENCY_RATE,
  PRIORITY_BOOST,
} from './blueprints';

export interface BudgetAllocation {
  readonly lines: readonly BudgetLine[];
  readonly contingencyRate: number;
}

type BudgetInput = Pick<PlanRequest, 'eventType' | 'budget' | 'priorities' | 'venueSetting'>;

/** Outdoor events reserve more for weather and logistics surprises. */
export function contingencyRateFor(setting: VenueSetting): number {
  return setting === 'outdoor' ? OUTDOOR_CONTINGENCY_RATE : CONTINGENCY_RATE;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Splits a whole-number `total` across `weights` using the largest-remainder
 * method, so the parts are integers and **always add up to exactly `total`**.
 * (Rounding each share independently routinely loses or invents a unit.)
 * Ties are broken by position, which keeps the result deterministic.
 */
export function apportion(weights: readonly number[], total: number): number[] {
  const weightSum = sum(weights);
  if (weights.length === 0 || !(weightSum > 0) || weights.some((w) => w < 0)) {
    throw new RangeError('Weights must be non-negative with a positive sum.');
  }
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError('Total must be a non-negative safe integer.');
  }

  const exact = weights.map((weight) => (weight / weightSum) * total);
  const parts = exact.map((value) => Math.floor(value));
  const leftover = total - sum(parts);

  const byLargestFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let step = 0; step < leftover; step += 1) {
    const target = byLargestFraction[step % byLargestFraction.length];
    if (target) parts[target.index] = (parts[target.index] ?? 0) + 1;
  }

  if (sum(parts) !== total) {
    throw new Error('Apportionment invariant violated: parts do not sum to the total.');
  }
  return parts;
}

/**
 * Allocates the budget across the event type's categories.
 *
 * 1. Start from the blueprint weights.
 * 2. Boost categories the host marked as priorities.
 * 3. Reserve a contingency (larger when the event is outdoors).
 * 4. Apportion whole units so the lines sum exactly to the budget.
 */
export function allocateBudget(request: BudgetInput): BudgetAllocation {
  const { categories } = BLUEPRINTS[request.eventType];
  const contingencyRate = contingencyRateFor(request.venueSetting);
  const prioritised = new Set(request.priorities);

  const boosted = categories.map((c) => c.priority !== null && prioritised.has(c.priority));
  const boostedWeights = categories.map((c, i) => c.weight * (boosted[i] ? PRIORITY_BOOST : 1));
  const boostedSum = sum(boostedWeights);

  const weights = [
    ...boostedWeights.map((weight) => (weight / boostedSum) * (1 - contingencyRate)),
    contingencyRate,
  ];
  const amounts = apportion(weights, request.budget);

  const share = (amount: number): number => Math.round((amount / request.budget) * 1000) / 10;

  const lines: BudgetLine[] = categories.map((category, index) => {
    const amount = amounts[index] ?? 0;
    return {
      categoryId: category.id,
      label: category.label,
      amount,
      sharePercent: share(amount),
      boosted: boosted[index] ?? false,
    };
  });

  const contingencyAmount = amounts[categories.length] ?? 0;
  lines.push({
    categoryId: 'contingency',
    label: CONTINGENCY_LABEL,
    amount: contingencyAmount,
    sharePercent: share(contingencyAmount),
    boosted: false,
  });

  return { lines, contingencyRate };
}
