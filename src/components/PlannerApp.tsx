'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';

import type { PlanResponse } from '@/lib/domain/types';
import { readPlanPayload } from '@/lib/client/formPayload';
import { requestPlan } from '@/lib/client/planApi';
import { validatePlanRequest, type FieldErrors } from '@/lib/validation/planRequest';

import { ErrorSummary, type ErrorSummaryItem } from './ErrorSummary';
import { FIELD_NAMES, FIELD_ORDER } from './fieldIds';
import { PlanForm } from './PlanForm';
import { PlanResults } from './PlanResults';

/** Everything that can go wrong, in one place, as plain data the UI renders. */
interface Problems {
  readonly fieldErrors: FieldErrors;
  readonly formMessage: string | null;
  /** Bumped on every failed attempt so focus moves even when the text repeats. */
  readonly version: number;
}

const NO_PROBLEMS: Problems = { fieldErrors: {}, formMessage: null, version: 0 };

function toSummaryItems(problems: Problems): ErrorSummaryItem[] {
  const items: ErrorSummaryItem[] = [];
  if (problems.formMessage) items.push({ message: problems.formMessage });
  if (problems.fieldErrors.form) items.push({ message: problems.fieldErrors.form });
  for (const field of FIELD_ORDER) {
    const message = problems.fieldErrors[field];
    if (message) items.push({ field, message: `${FIELD_NAMES[field]}: ${message}` });
  }
  return items;
}

export function PlannerApp() {
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<PlanResponse | null>(null);
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);

  const inFlight = useRef<AbortController | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // Moving focus is a side effect of *new* information arriving, not of rendering.
  useEffect(() => {
    if (problems.version > 0) summaryRef.current?.focus();
  }, [problems.version]);

  useEffect(() => {
    if (response) resultsHeadingRef.current?.focus();
  }, [response]);

  useEffect(
    () => () => {
      inFlight.current?.abort();
    },
    [],
  );

  function fail(next: Omit<Problems, 'version'>): void {
    setProblems((previous) => ({ ...next, version: previous.version + 1 }));
  }

  async function submit(payload: Record<string, unknown>): Promise<void> {
    const validation = validatePlanRequest(payload, new Date());
    if (!validation.ok) {
      fail({ fieldErrors: validation.fieldErrors, formMessage: null });
      return;
    }

    const controller = new AbortController();
    inFlight.current = controller;
    setSubmitting(true);
    try {
      const outcome = await requestPlan(validation.value, controller.signal);
      switch (outcome.kind) {
        case 'success':
          setProblems(NO_PROBLEMS);
          setResponse(outcome.data);
          break;
        case 'invalid':
          fail({ fieldErrors: outcome.fieldErrors, formMessage: null });
          break;
        case 'rate_limited':
          fail({
            fieldErrors: {},
            formMessage: `You have asked for several plans in a short time. Please wait about ${String(outcome.retryAfterSeconds)} seconds and try again.`,
          });
          break;
        case 'failed':
          fail({ fieldErrors: {}, formMessage: outcome.message });
          break;
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      setSubmitting(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    // The button uses aria-disabled (so it stays focusable), which does not block submits.
    if (inFlight.current) return;
    // Read the form synchronously: the event is not usable after an await.
    const payload = readPlanPayload(new FormData(event.currentTarget));
    void submit(payload);
  }

  const summaryItems = toSummaryItems(problems);

  return (
    <>
      <section aria-labelledby="form-heading">
        <h2 id="form-heading">Plan your event</h2>
        {summaryItems.length > 0 ? (
          <ErrorSummary
            ref={summaryRef}
            title={
              summaryItems.length === 1
                ? 'There is 1 thing to fix'
                : `There are ${String(summaryItems.length)} things to fix`
            }
            items={summaryItems}
          />
        ) : null}
        <PlanForm errors={problems.fieldErrors} submitting={submitting} onSubmit={handleSubmit} />
      </section>

      {response ? (
        <>
          <PlanResults response={response} headingRef={resultsHeadingRef} />
          <p className="no-print">
            <a href="#plan-form">Change my answers</a>
          </p>
        </>
      ) : null}
    </>
  );
}
