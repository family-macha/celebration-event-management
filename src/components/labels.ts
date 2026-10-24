import type {
  AccessNeed,
  Currency,
  DietaryNeed,
  EventType,
  Priority,
  TaskStatus,
  VenueSetting,
} from '@/lib/domain/types';

/** Human wording for the domain's enumerations. Display concerns stay out of the engine. */

export const EVENT_TYPE_OPTIONS: readonly {
  readonly value: EventType;
  readonly label: string;
  readonly hint: string;
}[] = [
  { value: 'wedding', label: 'Wedding', hint: 'Ceremony, reception and everything around them' },
  { value: 'birthday', label: 'Birthday', hint: 'Any age, at home or at a venue' },
  { value: 'community', label: 'Community event', hint: 'Fairs, meetups, fundraisers, festivals' },
];

export const EVENT_TITLE: Record<EventType, string> = {
  wedding: 'wedding',
  birthday: 'birthday',
  community: 'community event',
};

export const SETTING_OPTIONS: readonly { readonly value: VenueSetting; readonly label: string }[] =
  [
    { value: 'either', label: 'Not decided yet' },
    { value: 'indoor', label: 'Indoors' },
    { value: 'outdoor', label: 'Outdoors' },
  ];

export const SETTING_LABEL: Record<VenueSetting, string> = {
  either: 'Indoor or outdoor',
  indoor: 'Indoors',
  outdoor: 'Outdoors',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  food: 'Food and drink',
  venue: 'Venue',
  photography: 'Photography',
  entertainment: 'Entertainment',
  decor: 'Decor',
  guest_comfort: 'Guest comfort',
};

export const DIETARY_LABELS: Record<DietaryNeed, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  halal: 'Halal',
  jain: 'Jain',
  gluten_free: 'Gluten-free',
  nut_allergy: 'Nut allergy',
};

export const ACCESS_LABELS: Record<AccessNeed, string> = {
  step_free: 'Step-free access',
  seating_for_elders: 'Seating for elders',
  child_friendly: 'Child-friendly space',
  hearing_support: 'Hearing support',
};

export const CURRENCY_OPTIONS: readonly { readonly value: Currency; readonly label: string }[] = [
  { value: 'INR', label: 'INR (Indian rupee)' },
  { value: 'USD', label: 'USD (US dollar)' },
  { value: 'EUR', label: 'EUR (euro)' },
  { value: 'GBP', label: 'GBP (pound sterling)' },
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  on_track: 'On track',
  compressed: 'Compressed',
  urgent: 'Urgent',
};

export const FEASIBILITY_LABEL = {
  comfortable: 'Comfortable',
  tight: 'Tight',
  at_risk: 'At risk',
} as const;
