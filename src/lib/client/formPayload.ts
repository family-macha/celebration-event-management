/**
 * Turns browser form data into the shape the validator expects.
 *
 * Blank answers become `undefined` (so "required" and "optional" behave
 * correctly) and numeric text such as "1,50,000" becomes a number. Nothing is
 * trusted or cleaned here beyond that: the validator is the only authority.
 */

function readText(data: FormData, name: string): string | undefined {
  const value = data.get(name);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readNumber(data: FormData, name: string): number | undefined {
  const text = readText(data, name);
  if (text === undefined) return undefined;
  // Allow thousands separators and spaces: "1,50,000" and "1 500" are both natural.
  return Number(text.replace(/[\s,]/g, ''));
}

function readList(data: FormData, name: string): string[] {
  return data.getAll(name).filter((value): value is string => typeof value === 'string');
}

export function readPlanPayload(data: FormData): Record<string, unknown> {
  return {
    eventType: readText(data, 'eventType'),
    eventDate: readText(data, 'eventDate'),
    guestCount: readNumber(data, 'guestCount'),
    budget: readNumber(data, 'budget'),
    currency: readText(data, 'currency'),
    city: readText(data, 'city'),
    venueSetting: readText(data, 'venueSetting'),
    priorities: readList(data, 'priorities'),
    dietaryNeeds: readList(data, 'dietaryNeeds'),
    accessNeeds: readList(data, 'accessNeeds'),
    vibe: readText(data, 'vibe'),
  };
}
