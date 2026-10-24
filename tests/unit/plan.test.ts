import { describe, expect, it } from 'vitest';

import { daysBetween } from '@/lib/dates';
import { EVENT_TYPES, PHASES } from '@/lib/domain/types';
import {
  ACCESS_QUESTIONS,
  BLUEPRINTS,
  DIETARY_QUESTIONS,
  SETTING_QUESTIONS,
  planHorizonDays,
} from '@/lib/planner/blueprints';
import { buildPlan } from '@/lib/planner/buildPlan';

import { NOW, TODAY, inDays, makeRequest } from './helpers';

const DAY_COUNTS = [1, 14, 45, 120, 400];

describe('buildPlan invariants', () => {
  for (const eventType of EVENT_TYPES) {
    for (const days of DAY_COUNTS) {
      describe(`${eventType}, ${days} days ahead`, () => {
        const request = makeRequest({
          eventType,
          eventDate: inDays(days),
          budget: 777_777,
          priorities: [],
        });
        const plan = buildPlan(request, NOW);
        const horizon = planHorizonDays(eventType);

        it('splits the budget exactly', () => {
          const total = plan.budgetLines.reduce((acc, line) => acc + line.amount, 0);
          expect(total).toBe(request.budget);
        });

        it('lists tasks in date order with consistent offsets and unique ids', () => {
          const dates = plan.timeline.tasks.map((task) => task.dueDate);
          expect(dates).toEqual([...dates].sort());
          expect(new Set(plan.timeline.tasks.map((task) => task.id)).size).toBe(
            plan.timeline.tasks.length,
          );
          for (const task of plan.timeline.tasks) {
            expect(daysBetween(TODAY, task.dueDate)).toBe(task.daysFromToday);
            expect(task.daysFromToday).toBeGreaterThanOrEqual(0);
            expect(PHASES).toContain(task.phase);
          }
        });

        it('places event-day and follow-up tasks relative to the event itself', () => {
          for (const task of plan.timeline.tasks) {
            if (task.phase === 'Event day') expect(task.dueDate).toBe(request.eventDate);
            if (task.phase === 'Afterwards') {
              expect(task.dueDate > request.eventDate).toBe(true);
            }
            if (task.phase !== 'Afterwards') {
              expect(task.dueDate <= request.eventDate).toBe(true);
            }
          }
        });

        it('has a booking task for every vendor that agrees with the checklist', () => {
          for (const vendor of plan.vendors) {
            const task = plan.timeline.tasks.find((t) => t.id === `book-${vendor.categoryId}`);
            expect(task).toBeDefined();
            expect(task?.dueDate).toBe(vendor.bookBy);
            expect(task?.status).toBe(vendor.status);
            expect(task?.critical).toBe(vendor.essential);
          }
          const bookBy = plan.vendors.map((vendor) => vendor.bookBy);
          expect(bookBy).toEqual([...bookBy].sort());
        });

        it(days >= horizon ? 'needs no compression' : 'explains the compression', () => {
          if (days >= horizon) {
            expect(plan.timeline.notice).toBeNull();
            expect(plan.timeline.tasks.every((task) => task.status === 'on_track')).toBe(true);
          } else {
            expect(plan.timeline.notice).toContain(`Only ${days} day`);
          }
        });

        it('gives every vendor a share of the budget and at least one question', () => {
          for (const vendor of plan.vendors) {
            expect(vendor.budget).toBeGreaterThan(0);
            expect(vendor.questions.length).toBeGreaterThan(0);
          }
        });
      });
    }
  }

  it('is pure: same input, same output, and the request is not modified', () => {
    const request = makeRequest({ priorities: ['food'], dietaryNeeds: ['vegan'] });
    const snapshot = structuredClone(request);
    expect(buildPlan(request, NOW)).toEqual(buildPlan(request, NOW));
    expect(request).toEqual(snapshot);
  });

  it('refuses a date in the past', () => {
    expect(() => buildPlan(makeRequest({ eventDate: inDays(-3) }), NOW)).toThrow(RangeError);
  });

  it('mentions the number of days with correct singular wording', () => {
    const plan = buildPlan(makeRequest({ eventDate: inDays(1) }), NOW);
    expect(plan.timeline.notice).toContain('Only 1 day remain');
  });

  it('marks critical, late tasks as urgent and says how many', () => {
    const plan = buildPlan(makeRequest({ eventDate: inDays(14) }), NOW);
    const urgent = plan.timeline.tasks.filter((task) => task.status === 'urgent');
    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.every((task) => task.critical)).toBe(true);
    expect(plan.timeline.notice).toMatch(/marked urgent/);
  });
});

describe('vendor questions respond to the host context', () => {
  const venue = (plan: ReturnType<typeof buildPlan>) =>
    plan.vendors.find((vendor) => vendor.categoryId === 'venue');
  const catering = (plan: ReturnType<typeof buildPlan>) =>
    plan.vendors.find((vendor) => vendor.categoryId === 'catering');

  it('adds dietary questions to the caterer', () => {
    const without = catering(buildPlan(makeRequest(), NOW));
    const withNeeds = catering(
      buildPlan(makeRequest({ dietaryNeeds: ['vegetarian', 'nut_allergy'] }), NOW),
    );
    expect(withNeeds?.questions).toContain(DIETARY_QUESTIONS.vegetarian.catering);
    expect(withNeeds?.questions).toContain(DIETARY_QUESTIONS.nut_allergy.catering);
    expect(without?.questions).not.toContain(DIETARY_QUESTIONS.vegetarian.catering);
  });

  it('adds access questions to the venue', () => {
    const plan = buildPlan(
      makeRequest({ accessNeeds: ['step_free', 'seating_for_elders', 'child_friendly'] }),
      NOW,
    );
    expect(venue(plan)?.questions).toContain(ACCESS_QUESTIONS.step_free.venue);
    expect(venue(plan)?.questions).toContain(ACCESS_QUESTIONS.seating_for_elders.venue);
    expect(venue(plan)?.questions).toContain(ACCESS_QUESTIONS.child_friendly.venue);
  });

  it('asks about a weather backup only when the event is outdoors', () => {
    const outdoor = buildPlan(makeRequest({ venueSetting: 'outdoor' }), NOW);
    const indoor = buildPlan(makeRequest({ venueSetting: 'indoor' }), NOW);
    expect(venue(outdoor)?.questions).toContain(SETTING_QUESTIONS.outdoor.venue);
    expect(venue(indoor)?.questions).not.toContain(SETTING_QUESTIONS.outdoor.venue);
  });

  it('never repeats a question', () => {
    const plan = buildPlan(
      makeRequest({
        dietaryNeeds: ['vegan', 'vegetarian', 'halal', 'jain', 'gluten_free', 'nut_allergy'],
        accessNeeds: ['step_free', 'seating_for_elders', 'child_friendly', 'hearing_support'],
        venueSetting: 'outdoor',
      }),
      NOW,
    );
    for (const vendor of plan.vendors) {
      expect(new Set(vendor.questions).size).toBe(vendor.questions.length);
    }
  });
});

describe('blueprints', () => {
  it('every vendor category has a budget line and every milestone has a known phase', () => {
    for (const eventType of EVENT_TYPES) {
      const { categories, milestones } = BLUEPRINTS[eventType];
      const plan = buildPlan(makeRequest({ eventType }), NOW);
      const lineIds = new Set(plan.budgetLines.map((line) => line.categoryId));
      for (const category of categories) expect(lineIds.has(category.id)).toBe(true);
      for (const milestone of milestones) expect(PHASES).toContain(milestone.phase);
    }
  });
});
