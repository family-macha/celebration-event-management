import { z } from 'zod';

import type { PersonalisedIdeas } from '@/lib/domain/types';
import { sanitizeDeep } from '@/lib/security/sanitize';

const text = (max: number) => z.string().min(1).max(max);

/**
 * The contract for the model's output.
 *
 * It is used twice: converted to a JSON Schema so Gemini constrains its
 * response, and run again on whatever comes back, because constrained decoding
 * does not enforce string lengths and the output is still untrusted.
 * `.describe()` text is sent to the model as guidance.
 */
export const personalisedIdeasSchema = z.strictObject({
  headline: text(140).describe('One warm sentence capturing the spirit of this event.'),
  themeIdeas: z
    .array(
      z.strictObject({
        name: text(60).describe('Short theme name.'),
        description: text(240).describe('One or two sentences on how the theme looks and feels.'),
      }),
    )
    .min(2)
    .max(4)
    .describe('Distinct theme directions.'),
  menuSuggestions: z
    .array(text(200))
    .min(3)
    .max(5)
    .describe('Food and drink ideas that respect every dietary need.'),
  activityIdeas: z
    .array(text(200))
    .min(3)
    .max(5)
    .describe('Things for guests to do, suitable for the guest mix and access needs.'),
  decorTips: z.array(text(200)).min(2).max(4).describe('Practical, budget-aware decor tips.'),
  budgetSavingTips: z
    .array(text(200))
    .min(2)
    .max(4)
    .describe('Ways to save without hurting the guest experience.'),
  personalTouches: z
    .array(text(200))
    .min(2)
    .max(4)
    .describe('Small, meaningful details that make the event feel personal.'),
});

/** JSON Schema sent to Gemini (without the `$schema` marker the API does not need). */
export const personalisedIdeasJsonSchema: Record<string, unknown> = (() => {
  const { $schema: _omitted, ...schema } = z.toJSONSchema(personalisedIdeasSchema) as Record<
    string,
    unknown
  >;
  return schema;
})();

/** Longest single string we accept from the model, before schema limits apply. */
const MAX_MODEL_STRING = 400;

/**
 * Parses and validates the model's raw JSON text.
 * Strings are sanitised *before* validation so hidden characters and markup
 * delimiters never reach the page, and the strict schema then rejects anything
 * unexpected. Throws on invalid JSON or a schema mismatch.
 */
export function parseIdeas(rawText: string): PersonalisedIdeas {
  const parsed: unknown = JSON.parse(rawText);
  return personalisedIdeasSchema.parse(sanitizeDeep(parsed, MAX_MODEL_STRING));
}
