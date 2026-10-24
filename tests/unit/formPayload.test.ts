import { describe, expect, it } from 'vitest';

import { readPlanPayload } from '@/lib/client/formPayload';
import { validatePlanRequest } from '@/lib/validation/planRequest';

import { NOW, inDays } from './helpers';

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe('readPlanPayload', () => {
  it('reads every field, turning numeric text into numbers', () => {
    expect(
      readPlanPayload(
        form([
          ['eventType', 'wedding'],
          ['eventDate', '2027-02-14'],
          ['guestCount', ' 150 '],
          ['budget', '1,50,000'],
          ['currency', 'INR'],
          ['city', ' Ongole '],
          ['venueSetting', 'outdoor'],
          ['priorities', 'food'],
          ['priorities', 'venue'],
          ['dietaryNeeds', 'vegan'],
          ['accessNeeds', 'step_free'],
          ['vibe', 'garden party'],
        ]),
      ),
    ).toEqual({
      eventType: 'wedding',
      eventDate: '2027-02-14',
      guestCount: 150,
      budget: 150_000,
      currency: 'INR',
      city: 'Ongole',
      venueSetting: 'outdoor',
      priorities: ['food', 'venue'],
      dietaryNeeds: ['vegan'],
      accessNeeds: ['step_free'],
      vibe: 'garden party',
    });
  });

  it('turns blank answers into undefined so "required" and "optional" behave', () => {
    const payload = readPlanPayload(
      form([
        ['eventDate', ''],
        ['guestCount', '   '],
        ['city', ''],
        ['vibe', '  '],
      ]),
    );
    expect(payload).toMatchObject({
      eventType: undefined,
      eventDate: undefined,
      guestCount: undefined,
      budget: undefined,
      city: undefined,
      vibe: undefined,
      priorities: [],
      dietaryNeeds: [],
      accessNeeds: [],
    });
  });

  it('accepts spaces and commas as thousands separators', () => {
    expect(readPlanPayload(form([['budget', '1 500 000']])).budget).toBe(1_500_000);
    expect(readPlanPayload(form([['guestCount', '1,200']])).guestCount).toBe(1200);
  });

  it('leaves unparseable numbers as NaN for the validator to reject with a clear message', () => {
    const payload = readPlanPayload(
      form([
        ['guestCount', 'about a hundred'],
        ['budget', '12.5'],
      ]),
    );
    expect(payload.guestCount).toBeNaN();

    const result = validatePlanRequest(
      { ...payload, eventType: 'wedding', eventDate: inDays(50), currency: 'INR' },
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.guestCount).toMatch(/whole number/);
      expect(result.fieldErrors.budget).toMatch(/whole number/);
    }
  });

  it('ignores file uploads smuggled into the form', () => {
    const data = new FormData();
    data.append('city', new File(['x'], 'x.txt'));
    expect(readPlanPayload(data).city).toBeUndefined();
  });
});
