import type {
  AccessNeed,
  CategoryId,
  Currency,
  DietaryNeed,
  EventType,
  Phase,
  Priority,
  VenueSetting,
} from '@/lib/domain/types';

/**
 * Planning knowledge, expressed as data.
 *
 * Budget lines, the vendor checklist and the timeline are all *derived* from
 * these tables, so they cannot drift out of sync, and tuning the planner means
 * editing a table rather than control flow. Every number here is an
 * illustrative planning heuristic, not a market quote (see README, Assumptions).
 */

export type PlannedCategoryId = Exclude<CategoryId, 'contingency'>;

export interface VendorSpec {
  readonly label: string;
  /** Essential vendors are critical-path: missing them endangers the event. */
  readonly essential: boolean;
  /** Typical days before the event by which this vendor should be booked. */
  readonly leadDays: number;
  readonly questions: readonly string[];
}

export interface CategorySpec {
  readonly id: PlannedCategoryId;
  readonly label: string;
  /** Relative share of the allocatable budget (a blueprint's weights sum to 1). */
  readonly weight: number;
  /** The host priority that boosts this line, if any. */
  readonly priority: Priority | null;
  /** Discretionary lines are the first suggested when a budget is tight. */
  readonly discretionary: boolean;
  readonly vendor: VendorSpec | null;
}

export interface MilestoneSpec {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly phase: Phase;
  /** Days before the event. Zero is the event day; negative is afterwards. */
  readonly leadDays: number;
  readonly critical: boolean;
}

export interface EventBlueprint {
  readonly categories: readonly CategorySpec[];
  readonly milestones: readonly MilestoneSpec[];
}

export const CONTINGENCY_RATE = 0.1;
/** Outdoor events carry extra weather risk, so they reserve more. */
export const OUTDOOR_CONTINGENCY_RATE = 0.12;
/** Multiplier applied to a category's weight when the host prioritises it. */
export const PRIORITY_BOOST = 1.25;

export const BOOKING_TASK_DESCRIPTION =
  'Compare at least three quotes, check references, and sign a written agreement that states the deposit, the final payment date and the cancellation terms.';

const WEDDING: EventBlueprint = {
  categories: [
    {
      id: 'venue',
      label: 'Venue',
      weight: 0.22,
      priority: 'venue',
      discretionary: false,
      vendor: {
        label: 'Venue',
        essential: true,
        leadDays: 240,
        questions: [
          'What does the hire fee include (tables, chairs, power, cleaning)?',
          'What is the cancellation and date-change policy?',
          'What are the noise limits and the latest finish time?',
        ],
      },
    },
    {
      id: 'catering',
      label: 'Catering',
      weight: 0.3,
      priority: 'food',
      discretionary: false,
      vendor: {
        label: 'Caterer',
        essential: true,
        leadDays: 150,
        questions: [
          'Can we have a tasting before paying a deposit?',
          'What is the per-guest price and when is the final headcount locked?',
          'How do you handle allergens and food labelling?',
        ],
      },
    },
    {
      id: 'photography',
      label: 'Photography & video',
      weight: 0.1,
      priority: 'photography',
      discretionary: false,
      vendor: {
        label: 'Photographer & videographer',
        essential: true,
        leadDays: 210,
        questions: [
          'Can we see a full gallery from a real wedding, not just highlights?',
          'How many hours and how many shooters are included?',
          'When are edited photos delivered and who owns the rights?',
          'What is your backup plan if you are unwell on the day?',
        ],
      },
    },
    {
      id: 'decor',
      label: 'Decor & florals',
      weight: 0.1,
      priority: 'decor',
      discretionary: true,
      vendor: {
        label: 'Decorator / florist',
        essential: false,
        leadDays: 120,
        questions: [
          'Can you work to my budget using seasonal materials?',
          'Who sets up and clears the decor, and at what times?',
        ],
      },
    },
    {
      id: 'attire',
      label: 'Attire & grooming',
      weight: 0.08,
      priority: null,
      discretionary: false,
      vendor: {
        label: 'Attire & tailoring',
        essential: true,
        leadDays: 150,
        questions: [
          'How many fittings are included and how long do alterations take?',
          'What is the cancellation or refund policy?',
        ],
      },
    },
    {
      id: 'entertainment',
      label: 'Music & entertainment',
      weight: 0.08,
      priority: 'entertainment',
      discretionary: true,
      vendor: {
        label: 'Music / DJ / band',
        essential: false,
        leadDays: 150,
        questions: [
          'What is the set length and what equipment do you bring?',
          'Can you follow a do-not-play list and what are your overtime charges?',
        ],
      },
    },
    {
      id: 'stationery',
      label: 'Invitations & stationery',
      weight: 0.04,
      priority: null,
      discretionary: true,
      vendor: {
        label: 'Invitations & stationery',
        essential: false,
        leadDays: 100,
        questions: [
          'What is the proof and printing turnaround?',
          'Do you offer a digital version with RSVP tracking?',
        ],
      },
    },
    {
      id: 'transport',
      label: 'Transport & logistics',
      weight: 0.08,
      priority: 'guest_comfort',
      discretionary: false,
      vendor: {
        label: 'Transport & logistics',
        essential: false,
        leadDays: 90,
        questions: [
          'What is the cost per vehicle per hour and what happens if there are delays?',
          'Is there a backup vehicle?',
        ],
      },
    },
  ],
  milestones: [
    {
      id: 'budget',
      title: 'Agree the total budget and who is contributing',
      description: 'Every later decision depends on this number. Write it down and share it.',
      phase: 'Foundation',
      leadDays: 270,
      critical: true,
    },
    {
      id: 'guest-list',
      title: 'Draft the guest list',
      description: 'A first headcount drives venue size, catering cost and transport.',
      phase: 'Foundation',
      leadDays: 260,
      critical: true,
    },
    {
      id: 'legal',
      title: 'Confirm ceremony and legal requirements',
      description: 'Registration, officiant, documents and any waiting periods.',
      phase: 'Foundation',
      leadDays: 240,
      critical: true,
    },
    {
      id: 'invitations-out',
      title: 'Send invitations and open RSVPs',
      description: 'Ask for dietary and accessibility needs in the same message.',
      phase: 'Details',
      leadDays: 75,
      critical: false,
    },
    {
      id: 'menu-final',
      title: 'Finalise the menu after the tasting',
      description: 'Confirm dishes, quantities and the allergy list in writing.',
      phase: 'Details',
      leadDays: 60,
      critical: false,
    },
    {
      id: 'seating',
      title: 'Confirm RSVPs and draft the seating plan',
      description: 'Seat elders and anyone with access needs first.',
      phase: 'Final countdown',
      leadDays: 21,
      critical: false,
    },
    {
      id: 'headcount',
      title: 'Give the final headcount and dietary needs to vendors',
      description: 'Most caterers and venues lock numbers about two weeks out.',
      phase: 'Final countdown',
      leadDays: 14,
      critical: true,
    },
    {
      id: 'payments',
      title: 'Confirm final payments and tips for every vendor',
      description: 'Put the amount, the date and the person responsible on one sheet.',
      phase: 'Final countdown',
      leadDays: 7,
      critical: true,
    },
    {
      id: 'schedule',
      title: 'Share a day-of schedule with vendors and helpers',
      description: 'Include arrival times, who to call, and the plan if something slips.',
      phase: 'Final countdown',
      leadDays: 5,
      critical: false,
    },
    {
      id: 'rehearsal',
      title: 'Hold a rehearsal and pack an emergency kit',
      description: 'Sewing kit, first-aid, chargers, spare copies of documents.',
      phase: 'Final countdown',
      leadDays: 2,
      critical: false,
    },
    {
      id: 'event-day',
      title: 'Event day: vendors arrive and the schedule runs',
      description: 'Delegate. Name one person who answers vendor questions so you do not have to.',
      phase: 'Event day',
      leadDays: 0,
      critical: true,
    },
    {
      id: 'thank-you',
      title: 'Send thank-you notes and settle remaining invoices',
      description: 'Return rented items and collect any deposits that are refundable.',
      phase: 'Afterwards',
      leadDays: -14,
      critical: false,
    },
  ],
};

const BIRTHDAY: EventBlueprint = {
  categories: [
    {
      id: 'venue',
      label: 'Venue',
      weight: 0.2,
      priority: 'venue',
      discretionary: false,
      vendor: {
        label: 'Venue (or home set-up)',
        essential: true,
        leadDays: 35,
        questions: [
          'What is the hire fee and the maximum headcount?',
          'Are outside food and cake allowed?',
          'When can we get in to set up and when must we finish?',
        ],
      },
    },
    {
      id: 'catering',
      label: 'Food & drink',
      weight: 0.38,
      priority: 'food',
      discretionary: false,
      vendor: {
        label: 'Caterer / food',
        essential: true,
        leadDays: 21,
        questions: [
          'What is the per-guest price and the minimum order?',
          'How do you handle allergies and children’s portions?',
          'Are delivery and set-up included?',
        ],
      },
    },
    {
      id: 'cake_desserts',
      label: 'Cake & desserts',
      weight: 0.08,
      priority: 'food',
      discretionary: false,
      vendor: {
        label: 'Cake & desserts',
        essential: true,
        leadDays: 14,
        questions: [
          'Which flavours and dietary options (eggless, vegan, gluten-free) do you offer?',
          'How much notice do you need for a custom design?',
          'Who delivers it, and what happens if it is damaged?',
        ],
      },
    },
    {
      id: 'decor',
      label: 'Decor & balloons',
      weight: 0.12,
      priority: 'decor',
      discretionary: true,
      vendor: {
        label: 'Decor & balloons',
        essential: false,
        leadDays: 14,
        questions: ['Do you set up and take down?', 'What exactly is included in the package?'],
      },
    },
    {
      id: 'entertainment',
      label: 'Entertainment & games',
      weight: 0.14,
      priority: 'entertainment',
      discretionary: true,
      vendor: {
        label: 'Entertainer / DJ / games',
        essential: false,
        leadDays: 21,
        questions: [
          'Which age group are you best suited to and how long is the session?',
          'Do you bring all equipment, and what is your cancellation policy?',
        ],
      },
    },
    {
      id: 'photography',
      label: 'Photography',
      weight: 0.04,
      priority: 'photography',
      discretionary: true,
      vendor: {
        label: 'Photographer',
        essential: false,
        leadDays: 21,
        questions: [
          'How many hours are included and when are photos delivered?',
          'Is an online gallery or are prints included?',
        ],
      },
    },
    {
      id: 'party_favours',
      label: 'Favours & gifts',
      weight: 0.04,
      priority: null,
      discretionary: true,
      vendor: {
        label: 'Favours & gifts supplier',
        essential: false,
        leadDays: 10,
        questions: [
          'What is the minimum order and the delivery date?',
          'Are the items suitable for allergies and the guests’ ages?',
        ],
      },
    },
  ],
  milestones: [
    {
      id: 'budget-guests',
      title: 'Set the budget and draft the guest list',
      description: 'Decide the number of guests first; it drives food and venue cost.',
      phase: 'Foundation',
      leadDays: 45,
      critical: true,
    },
    {
      id: 'theme',
      title: 'Pick a theme and outline the party-day schedule',
      description: 'A simple arc (arrive, eat, activity, cake, goodbye) keeps the day relaxed.',
      phase: 'Foundation',
      leadDays: 42,
      critical: false,
    },
    {
      id: 'invitations',
      title: 'Send invitations and ask for RSVPs and dietary needs',
      description: 'Give a clear RSVP date a week or so before the final headcount is needed.',
      phase: 'Details',
      leadDays: 28,
      critical: true,
    },
    {
      id: 'menu',
      title: 'Confirm the menu, cake design and allergy list',
      description: 'Put allergies in writing with every food supplier.',
      phase: 'Details',
      leadDays: 14,
      critical: false,
    },
    {
      id: 'rsvp-chase',
      title: 'Chase outstanding RSVPs',
      description: 'A friendly reminder message works better than silence.',
      phase: 'Final countdown',
      leadDays: 10,
      critical: false,
    },
    {
      id: 'headcount',
      title: 'Share the final headcount and allergies with vendors',
      description: 'Suppliers need firm numbers to prepare and deliver on time.',
      phase: 'Final countdown',
      leadDays: 7,
      critical: true,
    },
    {
      id: 'payments',
      title: 'Confirm final payments and delivery times',
      description: 'Note who pays whom and when.',
      phase: 'Final countdown',
      leadDays: 3,
      critical: true,
    },
    {
      id: 'supplies',
      title: 'Prepare the playlist, games and an emergency kit',
      description: 'Spare batteries, wipes, plasters, and a phone charger.',
      phase: 'Final countdown',
      leadDays: 2,
      critical: false,
    },
    {
      id: 'event-day',
      title: 'Party day: set up, celebrate, and enjoy it',
      description: 'Ask a friend to handle deliveries so you can greet guests.',
      phase: 'Event day',
      leadDays: 0,
      critical: true,
    },
    {
      id: 'thank-you',
      title: 'Send thank-you messages and settle invoices',
      description: 'Return rented items and share a few photos.',
      phase: 'Afterwards',
      leadDays: -3,
      critical: false,
    },
  ],
};

const COMMUNITY: EventBlueprint = {
  categories: [
    {
      id: 'venue',
      label: 'Venue or open space',
      weight: 0.18,
      priority: 'venue',
      discretionary: false,
      vendor: {
        label: 'Venue or open space',
        essential: true,
        leadDays: 50,
        questions: [
          'Which permits or permissions does the venue require?',
          'What is the capacity limit and who is responsible for cleaning?',
          'Are power, water and toilets available?',
        ],
      },
    },
    {
      id: 'catering',
      label: 'Food & refreshments',
      weight: 0.3,
      priority: 'food',
      discretionary: false,
      vendor: {
        label: 'Caterer / food stalls',
        essential: true,
        leadDays: 21,
        questions: [
          'What is the per-head price and the minimum order?',
          'Do you hold the licences needed to serve food at this site?',
          'How do you label allergens?',
        ],
      },
    },
    {
      id: 'av_equipment',
      label: 'Sound & AV',
      weight: 0.12,
      priority: 'guest_comfort',
      discretionary: false,
      vendor: {
        label: 'Sound & AV hire',
        essential: false,
        leadDays: 21,
        questions: [
          'Is the system sized for this audience and venue?',
          'Is a technician included and how long is the set-up?',
          'What do extra microphones cost?',
        ],
      },
    },
    {
      id: 'marketing',
      label: 'Printing & promotion',
      weight: 0.1,
      priority: null,
      discretionary: true,
      vendor: {
        label: 'Printing & promotion',
        essential: false,
        leadDays: 35,
        questions: [
          'What is the turnaround for posters and banners?',
          'Can I keep the design files to reuse next time?',
        ],
      },
    },
    {
      id: 'activities',
      label: 'Programme & activities',
      weight: 0.14,
      priority: 'entertainment',
      discretionary: true,
      vendor: {
        label: 'Activities, performers & speakers',
        essential: false,
        leadDays: 35,
        questions: [
          'What is the length of the programme and your fee?',
          'Do you need equipment, a green room or travel costs covered?',
        ],
      },
    },
    {
      id: 'volunteers',
      label: 'Volunteer support',
      weight: 0.06,
      priority: 'guest_comfort',
      discretionary: true,
      vendor: null,
    },
    {
      id: 'safety_permits',
      label: 'Permits, insurance & first aid',
      weight: 0.1,
      priority: null,
      discretionary: false,
      vendor: {
        label: 'Permits, insurance & first aid',
        essential: true,
        leadDays: 45,
        questions: [
          'Which local permits or notifications does an event this size need?',
          'Do we need public-liability insurance?',
          'Who is the trained first-aider on site?',
        ],
      },
    },
  ],
  milestones: [
    {
      id: 'purpose',
      title: 'Define the goal, the audience and how you will measure success',
      description: 'One sentence each. It keeps every later decision honest.',
      phase: 'Foundation',
      leadDays: 60,
      critical: true,
    },
    {
      id: 'team',
      title: 'Recruit a core team and assign clear roles',
      description: 'Name an owner for venue, food, programme, promotion and safety.',
      phase: 'Foundation',
      leadDays: 56,
      critical: true,
    },
    {
      id: 'budget',
      title: 'Agree the budget, funding sources and spending approvals',
      description: 'Decide who can commit money, and up to what amount.',
      phase: 'Foundation',
      leadDays: 56,
      critical: true,
    },
    {
      id: 'promotion',
      title: 'Launch promotion: posters, social media and community groups',
      description: 'Use the channels your audience already reads, and include an access note.',
      phase: 'Details',
      leadDays: 28,
      critical: false,
    },
    {
      id: 'volunteers',
      title: 'Confirm volunteers and hold a briefing',
      description: 'Give each volunteer a role, a shift and a named point of contact.',
      phase: 'Final countdown',
      leadDays: 10,
      critical: true,
    },
    {
      id: 'run-sheet',
      title: 'Share the run-of-show and emergency contacts',
      description: 'One page with times, roles, and who to call for what.',
      phase: 'Final countdown',
      leadDays: 5,
      critical: false,
    },
    {
      id: 'site-visit',
      title: 'Walk the site: signage, access routes and a rain plan',
      description: 'Check from the point of view of someone using a wheelchair or pushchair.',
      phase: 'Final countdown',
      leadDays: 3,
      critical: false,
    },
    {
      id: 'event-day',
      title: 'Event day: run the programme',
      description: 'Keep a short list of decisions only the organiser makes.',
      phase: 'Event day',
      leadDays: 0,
      critical: true,
    },
    {
      id: 'debrief',
      title: 'Send thanks, collect feedback and close the accounts',
      description: 'Share what worked, what did not, and the final figures.',
      phase: 'Afterwards',
      leadDays: -7,
      critical: false,
    },
  ],
};

export const BLUEPRINTS: Readonly<Record<EventType, EventBlueprint>> = {
  wedding: WEDDING,
  birthday: BIRTHDAY,
  community: COMMUNITY,
};

export const CONTINGENCY_LABEL = 'Contingency (unexpected costs)';

/** The priorities that mean something for this event type (derived, never duplicated). */
export function applicablePriorities(eventType: EventType): readonly Priority[] {
  const found = new Set<Priority>();
  for (const category of BLUEPRINTS[eventType].categories) {
    if (category.priority) found.add(category.priority);
  }
  return [...found];
}

/** Typical lead time of the whole plan: how far ahead a standard plan begins. */
export function planHorizonDays(eventType: EventType): number {
  const { categories, milestones } = BLUEPRINTS[eventType];
  const leads = [
    ...milestones.map((m) => m.leadDays),
    ...categories.flatMap((c) => (c.vendor ? [c.vendor.leadDays] : [])),
  ];
  return Math.max(...leads);
}

/**
 * Per-guest, all-in budget heuristics, in whole currency units.
 * `lean` is the least that funds a simple event; `comfortable` funds a
 * well-rounded one. Illustrative only, tune freely.
 */
export const PER_GUEST_REFERENCE: Readonly<
  Record<Currency, Readonly<Record<EventType, { lean: number; comfortable: number }>>>
> = {
  INR: {
    wedding: { lean: 1500, comfortable: 3500 },
    birthday: { lean: 600, comfortable: 1400 },
    community: { lean: 200, comfortable: 450 },
  },
  USD: {
    wedding: { lean: 60, comfortable: 150 },
    birthday: { lean: 20, comfortable: 45 },
    community: { lean: 6, comfortable: 15 },
  },
  EUR: {
    wedding: { lean: 55, comfortable: 140 },
    birthday: { lean: 18, comfortable: 42 },
    community: { lean: 6, comfortable: 14 },
  },
  GBP: {
    wedding: { lean: 50, comfortable: 120 },
    birthday: { lean: 16, comfortable: 38 },
    community: { lean: 5, comfortable: 12 },
  },
};

type CategoryQuestions = Partial<Record<PlannedCategoryId, string>>;

/** Extra questions added to a vendor checklist because of a stated dietary need. */
export const DIETARY_QUESTIONS: Readonly<Record<DietaryNeed, CategoryQuestions>> = {
  vegetarian: {
    catering: 'Can every dish be clearly labelled and prepared separately from meat?',
  },
  vegan: {
    catering: 'Can you provide fully vegan dishes, including dessert?',
    cake_desserts: 'Can you make a fully vegan version of the cake?',
  },
  halal: {
    catering: 'Is all meat halal-certified, and is it prepared and served separately?',
  },
  jain: {
    catering:
      'Can you prepare Jain dishes without root vegetables, onion or garlic, using separate utensils?',
  },
  gluten_free: {
    catering: 'How do you prevent gluten cross-contact in the kitchen?',
    cake_desserts: 'Do you offer a gluten-free cake made in a separate space?',
  },
  nut_allergy: {
    catering: 'Is the kitchen nut-free, and how do you manage cross-contact?',
    cake_desserts: 'Are the desserts made in a nut-free environment?',
  },
};

/** Extra questions added because of a stated access need. */
export const ACCESS_QUESTIONS: Readonly<Record<AccessNeed, CategoryQuestions>> = {
  step_free: {
    venue: 'Are the entrance, the route to the main space and the toilets step-free?',
    transport: 'Do you have vehicles with ramps or a low floor?',
  },
  seating_for_elders: {
    venue: 'Can you provide chairs with arms, placed close to the food and the toilets?',
  },
  child_friendly: {
    venue: 'Is there a safe space for children and a baby-changing facility?',
  },
  hearing_support: {
    av_equipment: 'Do you offer a hearing loop or live captioning?',
    entertainment: 'Can volume be kept at a safe level, with announcements also shown visually?',
  },
};

/** Extra questions added because of the venue setting. */
export const SETTING_QUESTIONS: Readonly<Record<VenueSetting, CategoryQuestions>> = {
  indoor: {},
  either: {},
  outdoor: {
    venue: 'What is the weather backup (tent or indoor space) and who decides on the day?',
  },
};
