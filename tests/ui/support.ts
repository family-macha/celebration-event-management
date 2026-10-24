import { vi } from 'vitest';
import { axe } from 'jest-axe';

import { buildIdeasContext } from '@/lib/ai/context';
import { buildFallbackIdeas } from '@/lib/ai/fallbackIdeas';
import { addDays, toIsoDate } from '@/lib/dates';
import type { PlanRequest, PlanResponse } from '@/lib/domain/types';
import { buildPlan } from '@/lib/planner/buildPlan';
import { validatePlanRequest } from '@/lib/validation/planRequest';

/** A real date `days` from today, in the same UTC terms the app uses. */
export const dateInDays = (days: number): string => addDays(toIsoDate(new Date()), days);

/** What the real server would answer for a valid request, built with the real engine. */
export function planResponseFor(request: PlanRequest, source: 'gemini' | 'fallback' = 'fallback') {
  const now = new Date();
  const plan = buildPlan(request, now);
  const response: PlanResponse = {
    plan,
    ideas: buildFallbackIdeas(buildIdeasContext(request, plan)),
    ideasSource: source,
    generatedAt: now.toISOString(),
  };
  return response;
}

function serverLikeResponse(body: unknown): Response {
  const validation = validatePlanRequest(body, new Date());
  if (!validation.ok) {
    return Response.json(
      { error: { code: 'validation_failed', fieldErrors: validation.fieldErrors } },
      { status: 422 },
    );
  }
  return Response.json(planResponseFor(validation.value));
}

type FetchHandler = (body: unknown) => Response | Promise<Response>;

/** Replaces `fetch` for the test; by default it behaves like the real API. */
export function stubFetch(handler: FetchHandler = serverLikeResponse) {
  const stub = vi.fn<typeof fetch>((_url, init) =>
    Promise.resolve(handler(JSON.parse(init?.body as string))),
  );
  vi.stubGlobal('fetch', stub);
  return stub;
}

/** Violations as readable strings, so a failure says what is wrong and where. */
export async function accessibilityViolations(container: Element): Promise<string[]> {
  // `region` expects page landmarks, which the root layout (not under test here) provides.
  const results = await axe(container, { rules: { region: { enabled: false } } });
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`,
  );
}
