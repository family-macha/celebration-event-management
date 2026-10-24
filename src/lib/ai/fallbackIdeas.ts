import type {
  AccessNeed,
  DietaryNeed,
  EventType,
  FeasibilityLevel,
  PersonalisedIdeas,
  ThemeIdea,
  VenueSetting,
} from '@/lib/domain/types';
import { EVENT_LABEL } from '@/lib/format';

import type { IdeasContext } from './context';

/**
 * Built-in ideas used when no API key is configured or the model call fails.
 * They respond to the same context as the model (event type, setting, dietary
 * and access needs, budget tightness), so the page stays useful offline.
 */

interface ThemePoolEntry extends ThemeIdea {
  readonly setting: 'any' | 'indoor' | 'outdoor';
}

const THEMES: Readonly<Record<EventType, readonly ThemePoolEntry[]>> = {
  wedding: [
    {
      name: 'Garden golden hour',
      description: 'Soft evening light, wildflower arrangements and long shared tables.',
      setting: 'outdoor',
    },
    {
      name: 'Heritage and family',
      description: 'Traditional motifs, family textiles and music your elders will recognise.',
      setting: 'any',
    },
    {
      name: 'Candlelit modern',
      description: 'Clean lines, warm candles and a short, elegant programme.',
      setting: 'indoor',
    },
    {
      name: 'Colour-story celebration',
      description: 'Two or three bold colours repeated across flowers, napkins and lighting.',
      setting: 'any',
    },
  ],
  birthday: [
    {
      name: 'Favourite-things party',
      description: 'Build the day around the guest of honour’s hobbies, colours and snacks.',
      setting: 'any',
    },
    {
      name: 'Backyard picnic',
      description: 'Blankets, simple finger food and lawn games.',
      setting: 'outdoor',
    },
    {
      name: 'Retro game night',
      description: 'Board games, a throwback playlist and snacks from the birthday person’s past.',
      setting: 'indoor',
    },
    {
      name: 'Decade throwback',
      description: 'Dress-up and music from the year they were born.',
      setting: 'any',
    },
  ],
  community: [
    {
      name: 'Neighbours’ table',
      description: 'Long shared tables, potluck dishes and name tags that invite conversation.',
      setting: 'any',
    },
    {
      name: 'Open-air fair',
      description: 'Stalls, music and activity corners that people can drift between.',
      setting: 'outdoor',
    },
    {
      name: 'Showcase evening',
      description: 'Short performances and talks from local people, with time to mingle after.',
      setting: 'indoor',
    },
    {
      name: 'Skills and stories',
      description: 'Informal sessions where residents teach a skill or share a story.',
      setting: 'any',
    },
  ],
};

const MENU_BASE: Readonly<Record<EventType, readonly string[]>> = {
  wedding: [
    'A shared-plate starter, a choice of two mains, and one signature dessert',
    'A regional speciality the families grew up with',
    'A non-alcoholic signature drink alongside the bar',
  ],
  birthday: [
    'Build-your-own food stations so everyone eats what they like',
    'The birthday person’s three favourite dishes, served family-style',
    'A cake plus a simple dessert table',
  ],
  community: [
    'A potluck table with a sign-up sheet to balance dishes',
    'A hot main from a local caterer plus shared sides',
    'Free water and one inexpensive hot drink',
  ],
};

const DIETARY_MENU: Readonly<Record<DietaryNeed, string>> = {
  vegetarian: 'A full vegetarian main that is a highlight, not an afterthought',
  vegan: 'A plant-based dish and dessert, clearly labelled',
  halal: 'Halal-certified meat served from a separate, labelled station',
  jain: 'A Jain-friendly menu without root vegetables, onion or garlic, prepared separately',
  gluten_free: 'Naturally gluten-free dishes such as rice, lentils and grilled vegetables',
  nut_allergy: 'A nut-free menu with ingredient cards beside every dish',
};

const ACTIVITIES_BASE: Readonly<Record<EventType, readonly string[]>> = {
  wedding: [
    'A photo wall where guests add a handwritten wish',
    'A short family-and-friends toast round, kept to two minutes each',
    'A first-dance warm-up lesson for anyone who wants to join',
  ],
  birthday: [
    'A scavenger hunt themed on the guest of honour’s life',
    'A memory jar where guests write a favourite moment',
    'A group photo with props at the start of the party',
  ],
  community: [
    'A welcome table where newcomers are introduced to neighbours',
    'A skills-swap corner with a short sign-up sheet',
    'A feedback wall: one thing to keep, one thing to try next time',
  ],
};

const ACCESS_ACTIVITIES: Readonly<Record<AccessNeed, string>> = {
  step_free: 'Place every activity along a step-free route and mark it with clear signs',
  seating_for_elders: 'Set up a quiet seating corner with a good view and easy access to food',
  child_friendly: 'A supervised children’s corner with colouring, a story hour and snacks',
  hearing_support: 'Pair every announcement with a visual cue or printed programme',
};

const DECOR_BASE: Readonly<Record<EventType, readonly string[]>> = {
  wedding: [
    'Repeat two or three colours everywhere instead of buying many different pieces',
    'Reuse ceremony flowers at the reception tables',
    'Use warm string lights; they transform a space for very little cost',
  ],
  birthday: [
    'Make one standout focal point, such as a balloon arch or a photo backdrop',
    'Print favourite photos as a simple timeline of the birthday person’s life',
    'Choose a two-colour palette so cheap decor still looks coordinated',
  ],
  community: [
    'Use clear signage and banners instead of heavy decoration',
    'Borrow tables, bunting and plants from neighbours and local groups',
    'Mark the entrance and the accessible route with unmistakable signs',
  ],
};

const DECOR_BY_SETTING: Readonly<Record<VenueSetting, string>> = {
  outdoor: 'Weigh down lightweight decor against wind, and plan shade or a tent for the sun',
  indoor:
    'Light the room in layers (candles, string lights) rather than relying on overhead lights',
  either: 'Choose decor that works both indoors and out, so a weather change is not a crisis',
};

const SAVING_TIPS: Readonly<Record<FeasibilityLevel, readonly string[]>> = {
  comfortable: [
    'Book the essentials first; late bookings are where prices quietly climb',
    'Ask each vendor what is included before comparing totals',
  ],
  tight: [
    'Put your money into the one or two things guests will remember, and keep the rest simple',
    'Ask vendors about off-peak days or times; weekday and daytime events are often cheaper',
    'Borrow or rent decor instead of buying it',
  ],
  at_risk: [
    'Shorten the event or hold it in the daytime to cut food and venue costs',
    'Ask family and friends to contribute a dish or a skill instead of money',
    'Reduce the guest list before cutting quality; fewer guests keeps the experience good',
    'Choose a free or low-cost venue such as a community hall, park or home',
  ],
};

const PERSONAL_TOUCHES: Readonly<Record<EventType, readonly string[]>> = {
  wedding: [
    'A short handwritten note at each place setting',
    'A playlist of songs that matter to both families',
    'A table named after a place or memory that is special to the couple',
  ],
  birthday: [
    'A letter or short video from friends, played during the cake moment',
    'The guest of honour’s favourite snack as a surprise on every table',
    'A guestbook where everyone writes one wish for the year ahead',
  ],
  community: [
    'A thank-you to every volunteer by name, said out loud',
    'A display of local history or photos from past events',
    'A shared tradition or ritual that opens the event, however small',
  ],
};

const TONE: Readonly<Record<FeasibilityLevel, string>> = {
  comfortable: 'relaxed',
  tight: 'smart, well-prioritised',
  at_risk: 'simple, carefully prioritised',
};

/** Deterministic: the same context always yields the same ideas. */
export function buildFallbackIdeas(context: IdeasContext): PersonalisedIdeas {
  const { eventType, venueSetting } = context;

  const themeIdeas = THEMES[eventType]
    .filter(
      (theme) =>
        venueSetting === 'either' || theme.setting === 'any' || theme.setting === venueSetting,
    )
    .slice(0, 3)
    .map(({ name, description }) => ({ name, description }));

  const menuSuggestions = [
    ...context.dietaryNeeds.map((need) => DIETARY_MENU[need]),
    ...MENU_BASE[eventType],
  ].slice(0, 5);

  const activityIdeas = [
    ...context.accessNeeds.map((need) => ACCESS_ACTIVITIES[need]),
    ...ACTIVITIES_BASE[eventType],
  ].slice(0, 5);

  const place = context.city ? ` in ${context.city}` : '';

  return {
    headline: `A ${TONE[context.feasibility]} ${EVENT_LABEL[eventType]}${place} for ${context.guestCount} guests, planned around what matters to you.`,
    themeIdeas,
    menuSuggestions,
    activityIdeas,
    decorTips: [...DECOR_BASE[eventType], DECOR_BY_SETTING[venueSetting]].slice(0, 4),
    budgetSavingTips: [...SAVING_TIPS[context.feasibility]],
    personalTouches: [...PERSONAL_TOUCHES[eventType]],
  };
}
