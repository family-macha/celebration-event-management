/**
 * Domain vocabulary shared by the planning engine, the API and the UI.
 * Pure types and constants: no framework or I/O imports.
 */

export const EVENT_TYPES = ['wedding', 'birthday', 'community'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PRIORITIES = [
  'food',
  'venue',
  'photography',
  'entertainment',
  'decor',
  'guest_comfort',
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DIETARY_NEEDS = [
  'vegetarian',
  'vegan',
  'halal',
  'jain',
  'gluten_free',
  'nut_allergy',
] as const;
export type DietaryNeed = (typeof DIETARY_NEEDS)[number];

export const ACCESS_NEEDS = [
  'step_free',
  'seating_for_elders',
  'child_friendly',
  'hearing_support',
] as const;
export type AccessNeed = (typeof ACCESS_NEEDS)[number];

export const VENUE_SETTINGS = ['indoor', 'outdoor', 'either'] as const;
export type VenueSetting = (typeof VENUE_SETTINGS)[number];

export const CATEGORY_IDS = [
  'venue',
  'catering',
  'cake_desserts',
  'decor',
  'photography',
  'entertainment',
  'attire',
  'stationery',
  'transport',
  'party_favours',
  'av_equipment',
  'marketing',
  'activities',
  'volunteers',
  'safety_permits',
  'contingency',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Limits shared by validation, UI hints and tests. */
export const LIMITS = {
  guestCount: { min: 1, max: 5000 },
  budget: { min: 1, max: 1_000_000_000 },
  maxPriorities: 3,
  cityMaxLength: 80,
  vibeMaxLength: 280,
  /** Event must be at least this many days away (dates are interpreted in UTC). */
  minDaysAhead: 1,
  maxDaysAhead: 1095,
} as const;

/** A validated planning request. Produced only by the validation layer. */
export interface PlanRequest {
  readonly eventType: EventType;
  /** ISO calendar date, `YYYY-MM-DD`. */
  readonly eventDate: string;
  readonly guestCount: number;
  /** Whole currency units. */
  readonly budget: number;
  readonly currency: Currency;
  readonly city?: string | undefined;
  readonly venueSetting: VenueSetting;
  readonly priorities: readonly Priority[];
  readonly dietaryNeeds: readonly DietaryNeed[];
  readonly accessNeeds: readonly AccessNeed[];
  readonly vibe?: string | undefined;
}

export interface BudgetLine {
  readonly categoryId: CategoryId;
  readonly label: string;
  /** Whole currency units. All lines sum exactly to the total budget. */
  readonly amount: number;
  /** One decimal place, e.g. 22.5. */
  readonly sharePercent: number;
  /** True when this line was boosted because the host prioritised it. */
  readonly boosted: boolean;
}

export type FeasibilityLevel = 'comfortable' | 'tight' | 'at_risk';

export interface Feasibility {
  readonly level: FeasibilityLevel;
  readonly perGuest: number;
  readonly leanPerGuest: number;
  readonly comfortablePerGuest: number;
  readonly maxGuestsForComfortable: number;
  readonly advice: readonly string[];
}

/**
 * - `on_track`: the standard lead time fits in the time remaining.
 * - `compressed`: the standard lead time does not fit; the date was pulled in.
 * - `urgent`: compressed *and* critical to the event going ahead.
 */
export type TaskStatus = 'on_track' | 'compressed' | 'urgent';

/** Timeline phases, in chronological order. */
export const PHASES = [
  'Foundation',
  'Booking',
  'Details',
  'Final countdown',
  'Event day',
  'Afterwards',
] as const;
export type Phase = (typeof PHASES)[number];

export interface TimelineTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly phase: Phase;
  /** ISO calendar date. */
  readonly dueDate: string;
  readonly daysFromToday: number;
  readonly critical: boolean;
  readonly status: TaskStatus;
}

export interface VendorItem {
  readonly categoryId: CategoryId;
  readonly label: string;
  readonly essential: boolean;
  readonly budget: number;
  /** ISO calendar date by which this vendor should be booked. */
  readonly bookBy: string;
  readonly daysFromToday: number;
  readonly status: TaskStatus;
  readonly questions: readonly string[];
}

export interface Plan {
  readonly summary: {
    readonly eventType: EventType;
    readonly eventDate: string;
    readonly daysUntilEvent: number;
    readonly guestCount: number;
    readonly budget: number;
    readonly currency: Currency;
    readonly perGuest: number;
    readonly venueSetting: VenueSetting;
  };
  readonly budgetLines: readonly BudgetLine[];
  readonly contingencyRate: number;
  readonly feasibility: Feasibility;
  readonly timeline: {
    readonly tasks: readonly TimelineTask[];
    /** Present when the schedule had to be compressed. */
    readonly notice: string | null;
  };
  readonly vendors: readonly VendorItem[];
}

export interface ThemeIdea {
  readonly name: string;
  readonly description: string;
}

export interface PersonalisedIdeas {
  readonly headline: string;
  readonly themeIdeas: readonly ThemeIdea[];
  readonly menuSuggestions: readonly string[];
  readonly activityIdeas: readonly string[];
  readonly decorTips: readonly string[];
  readonly budgetSavingTips: readonly string[];
  readonly personalTouches: readonly string[];
}

export type IdeasSource = 'gemini' | 'fallback';

export interface PlanResponse {
  readonly plan: Plan;
  readonly ideas: PersonalisedIdeas;
  readonly ideasSource: IdeasSource;
  readonly generatedAt: string;
}
