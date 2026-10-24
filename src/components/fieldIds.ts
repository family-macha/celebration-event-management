import type { PlanRequestField } from '@/lib/validation/planRequest';

/**
 * The id of the first focusable control for each form field. Error summary
 * links and focus management both rely on this single mapping.
 */
export const FIELD_IDS: Readonly<Record<PlanRequestField, string>> = {
  eventType: 'field-eventType',
  eventDate: 'field-eventDate',
  guestCount: 'field-guestCount',
  budget: 'field-budget',
  currency: 'field-currency',
  city: 'field-city',
  venueSetting: 'field-venueSetting',
  priorities: 'field-priorities',
  dietaryNeeds: 'field-dietaryNeeds',
  accessNeeds: 'field-accessNeeds',
  vibe: 'field-vibe',
};

/** Order fields appear on screen, so the error summary reads top to bottom. */
export const FIELD_ORDER: readonly PlanRequestField[] = [
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
];

export const FIELD_NAMES: Readonly<Record<PlanRequestField, string>> = {
  eventType: 'Type of event',
  eventDate: 'Event date',
  guestCount: 'Number of guests',
  budget: 'Total budget',
  currency: 'Currency',
  city: 'City',
  venueSetting: 'Venue setting',
  priorities: 'Priorities',
  dietaryNeeds: 'Dietary needs',
  accessNeeds: 'Access needs',
  vibe: 'Style or vibe',
};
