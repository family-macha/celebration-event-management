'use client';

import { useState, type SubmitEvent } from 'react';

import { ACCESS_NEEDS, DIETARY_NEEDS, LIMITS, type EventType } from '@/lib/domain/types';
import { applicablePriorities } from '@/lib/planner/blueprints';
import type { FieldErrors } from '@/lib/validation/planRequest';

import { ChoiceGroup } from './ChoiceGroup';
import { Field } from './Field';
import { FIELD_IDS } from './fieldIds';
import {
  ACCESS_LABELS,
  CURRENCY_OPTIONS,
  DIETARY_LABELS,
  EVENT_TYPE_OPTIONS,
  PRIORITY_LABELS,
  SETTING_OPTIONS,
} from './labels';

interface PlanFormProps {
  readonly errors: FieldErrors;
  readonly submitting: boolean;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}

/**
 * The planning questionnaire.
 *
 * `noValidate` hands validation to our own accessible messages (shown inline
 * and in the error summary) instead of the browser's transient tooltips.
 * Which priorities are offered depends on the event type, so the form never
 * lets someone choose a priority that has no effect.
 */
export function PlanForm({ errors, submitting, onSubmit }: PlanFormProps) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const priorityOptions = eventType
    ? applicablePriorities(eventType).map((value) => ({ value, label: PRIORITY_LABELS[value] }))
    : [];

  return (
    <form id="plan-form" noValidate onSubmit={onSubmit} aria-describedby="form-intro">
      <p id="form-intro" className="lede">
        Tell us about the event. Only the first few answers are required; the rest sharpen the plan.
      </p>

      <ChoiceGroup
        name="eventType"
        legend="Type of event"
        type="radio"
        required
        firstInputId={FIELD_IDS.eventType}
        error={errors.eventType}
        selectedValue={eventType ?? null}
        onValueChange={(value) => {
          setEventType(value as EventType);
        }}
        options={EVENT_TYPE_OPTIONS.map(({ value, label, hint }) => ({ value, label, hint }))}
      />

      <Field
        id={FIELD_IDS.eventDate}
        label="Event date"
        hint="Between tomorrow and three years from now."
        error={errors.eventDate}
      >
        {(control) => <input {...control} name="eventDate" type="date" required />}
      </Field>

      <Field
        id={FIELD_IDS.guestCount}
        label="Number of guests"
        hint={`Your best estimate, up to ${LIMITS.guestCount.max.toLocaleString('en-US')}.`}
        error={errors.guestCount}
      >
        {(control) => (
          <input
            {...control}
            name="guestCount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        )}
      </Field>

      <div className="field-row">
        <Field
          id={FIELD_IDS.budget}
          label="Total budget"
          hint="Everything included. Whole numbers; commas are fine."
          error={errors.budget}
        >
          {(control) => (
            <input
              {...control}
              name="budget"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          )}
        </Field>
        <Field id={FIELD_IDS.currency} label="Currency" error={errors.currency}>
          {(control) => (
            <select {...control} name="currency" defaultValue="INR">
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        id={FIELD_IDS.city}
        label="City"
        optional
        hint="Helps tailor ideas to where you are."
        error={errors.city}
      >
        {(control) => (
          <input
            {...control}
            name="city"
            type="text"
            autoComplete="off"
            maxLength={LIMITS.cityMaxLength}
          />
        )}
      </Field>

      <ChoiceGroup
        name="venueSetting"
        legend="Venue setting"
        type="radio"
        firstInputId={FIELD_IDS.venueSetting}
        error={errors.venueSetting}
        defaultValue="either"
        options={SETTING_OPTIONS.map(({ value, label }) => ({ value, label }))}
      />

      <ChoiceGroup
        name="priorities"
        legend="What matters most?"
        type="checkbox"
        optional
        firstInputId={FIELD_IDS.priorities}
        hint={
          eventType
            ? `Choose up to ${LIMITS.maxPriorities}. These get a larger share of the budget.`
            : 'Choose the type of event first to see the options.'
        }
        error={errors.priorities}
        options={priorityOptions}
      />

      <ChoiceGroup
        name="dietaryNeeds"
        legend="Dietary needs among your guests"
        type="checkbox"
        optional
        firstInputId={FIELD_IDS.dietaryNeeds}
        error={errors.dietaryNeeds}
        options={DIETARY_NEEDS.map((value) => ({ value, label: DIETARY_LABELS[value] }))}
      />

      <ChoiceGroup
        name="accessNeeds"
        legend="Access and comfort needs"
        type="checkbox"
        optional
        firstInputId={FIELD_IDS.accessNeeds}
        error={errors.accessNeeds}
        options={ACCESS_NEEDS.map((value) => ({ value, label: ACCESS_LABELS[value] }))}
      />

      <Field
        id={FIELD_IDS.vibe}
        label="Style or vibe"
        optional
        hint={`For example: “relaxed garden party with live music”. Up to ${LIMITS.vibeMaxLength} characters.`}
        error={errors.vibe}
      >
        {(control) => (
          <textarea {...control} name="vibe" rows={3} maxLength={LIMITS.vibeMaxLength} />
        )}
      </Field>

      <div className="actions">
        <button type="submit" className="button-primary" aria-disabled={submitting}>
          {submitting ? 'Building your plan…' : 'Build my plan'}
        </button>
        <p role="status" className="status">
          {submitting ? 'Building your plan. This usually takes a few seconds.' : ''}
        </p>
      </div>
    </form>
  );
}
