import { z } from 'zod';

import { addDays, daysBetween, isRealIsoDate, toIsoDate } from '@/lib/dates';
import {
  ACCESS_NEEDS,
  CURRENCIES,
  DIETARY_NEEDS,
  EVENT_TYPES,
  LIMITS,
  PRIORITIES,
  VENUE_SETTINGS,
  type PlanRequest,
} from '@/lib/domain/types';
import { applicablePriorities } from '@/lib/planner/blueprints';
import { sanitizeFreeText } from '@/lib/security/sanitize';

/**
 * The single definition of a valid planning request.
 *
 * The browser uses it for instant feedback and the API uses it as the actual
 * gate, so the two can never disagree. Messages say what is wrong *and* how to
 * fix it, because they are shown to people verbatim.
 */

/** Letters (any script), digits, spaces and light punctuation: enough for any city name. */
const CITY_PATTERN = /^[\p{L}\p{M}0-9 .,'’-]+$/u;

const uniqueList = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

function buildSchema(now: Date) {
  const today = toIsoDate(now);

  return z
    .strictObject({
      eventType: z.enum(EVENT_TYPES, { error: 'Choose a type of event.' }),

      eventDate: z.string({ error: 'Choose the event date.' }).superRefine((value, ctx) => {
        if (!isRealIsoDate(value)) {
          ctx.addIssue({ code: 'custom', message: 'Enter a real date, for example 2027-02-14.' });
          return;
        }
        const daysAhead = daysBetween(today, value);
        if (daysAhead < LIMITS.minDaysAhead) {
          ctx.addIssue({
            code: 'custom',
            message: `Choose a date after ${today}; a plan needs at least one day.`,
          });
        } else if (daysAhead > LIMITS.maxDaysAhead) {
          ctx.addIssue({
            code: 'custom',
            message: `Choose a date before ${addDays(today, LIMITS.maxDaysAhead + 1)}; plans look at most three years ahead.`,
          });
        }
      }),

      guestCount: z
        .number({ error: 'Enter the number of guests as a whole number.' })
        .int({ error: 'Guests must be a whole number.' })
        .min(LIMITS.guestCount.min, { error: 'Enter at least 1 guest.' })
        .max(LIMITS.guestCount.max, {
          error: `Enter ${LIMITS.guestCount.max.toLocaleString('en-US')} guests or fewer.`,
        }),

      budget: z
        .number({ error: 'Enter your total budget as a whole number.' })
        .int({ error: 'Budget must be a whole number, without decimals.' })
        .min(LIMITS.budget.min, { error: 'Budget must be greater than zero.' })
        .max(LIMITS.budget.max, { error: 'That budget is larger than this planner supports.' }),

      currency: z.enum(CURRENCIES, { error: 'Choose a currency.' }),

      city: z
        .string()
        .max(LIMITS.cityMaxLength, {
          error: `Keep the city under ${LIMITS.cityMaxLength} characters.`,
        })
        .regex(CITY_PATTERN, {
          error: 'Use letters, numbers, spaces, commas, apostrophes or hyphens only.',
        })
        .optional(),

      venueSetting: z
        .enum(VENUE_SETTINGS, { error: 'Choose indoor, outdoor or either.' })
        .default('either'),

      priorities: z
        .array(z.enum(PRIORITIES), { error: 'Priorities must be a list.' })
        .max(LIMITS.maxPriorities, {
          error: `Choose up to ${LIMITS.maxPriorities} priorities so they stay meaningful.`,
        })
        .transform(uniqueList)
        .default([]),

      dietaryNeeds: z
        .array(z.enum(DIETARY_NEEDS), { error: 'Dietary needs must be a list.' })
        .transform(uniqueList)
        .default([]),

      accessNeeds: z
        .array(z.enum(ACCESS_NEEDS), { error: 'Access needs must be a list.' })
        .transform(uniqueList)
        .default([]),

      vibe: z
        .string()
        .max(LIMITS.vibeMaxLength, {
          error: `Keep this under ${LIMITS.vibeMaxLength} characters.`,
        })
        .transform((value) => sanitizeFreeText(value, LIMITS.vibeMaxLength) || undefined)
        .optional(),
    })
    .superRefine((value, ctx) => {
      const allowed = applicablePriorities(value.eventType);
      const invalid = value.priorities.filter((priority) => !allowed.includes(priority));
      if (invalid.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['priorities'],
          message: `These priorities do not apply to this kind of event: ${invalid.join(', ')}.`,
        });
      }
    });
}

export type PlanRequestField = keyof PlanRequest;
export type FieldErrors = Partial<Record<PlanRequestField | 'form', string>>;

export type ValidationResult =
  | { readonly ok: true; readonly value: PlanRequest }
  | { readonly ok: false; readonly fieldErrors: FieldErrors };

const KNOWN_FIELDS: ReadonlySet<string> = new Set<PlanRequestField>([
  'eventType',
  'eventDate',
  'guestCount',
  'budget',
  'currency',
  'city',
  'venueSetting',
  'priorities',
  'dietaryNeeds',
  'accessNeeds',
  'vibe',
]);

/** Validates untrusted input. `now` is injected so behaviour is deterministic in tests. */
export function validatePlanRequest(input: unknown, now: Date): ValidationResult {
  const result = buildSchema(now).safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const head = issue.path[0];
    const field =
      typeof head === 'string' && KNOWN_FIELDS.has(head) ? (head as PlanRequestField) : 'form';
    // Keep the first message per field: it is the most fundamental one.
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
