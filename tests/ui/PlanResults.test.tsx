import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeasibilityCard } from '@/components/FeasibilityCard';
import { PlanResults } from '@/components/PlanResults';
import { EVENT_TYPES, type PlanRequest } from '@/lib/domain/types';

import { accessibilityViolations, dateInDays, planResponseFor } from './support';

afterEach(() => {
  vi.restoreAllMocks();
});

function request(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    eventType: 'wedding',
    eventDate: dateInDays(300),
    guestCount: 120,
    budget: 900_000,
    currency: 'INR',
    venueSetting: 'outdoor',
    priorities: ['food'],
    dietaryNeeds: ['vegetarian'],
    accessNeeds: ['seating_for_elders'],
    ...overrides,
  };
}

describe('PlanResults', () => {
  it('has a logical heading outline without skipped levels', () => {
    render(<PlanResults response={planResponseFor(request())} />);
    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName[1]));

    expect(levels[0]).toBe(2);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]!).toBeLessThanOrEqual(levels[index - 1]! + 1);
    }
  });

  for (const eventType of EVENT_TYPES) {
    it(`passes automated accessibility checks for a ${eventType} plan, relaxed and urgent`, async () => {
      for (const days of [400, 10]) {
        const { container, unmount } = render(
          <PlanResults
            response={planResponseFor(
              request({ eventType, eventDate: dateInDays(days), priorities: [] }),
            )}
          />,
        );
        expect(await accessibilityViolations(container)).toEqual([]);
        unmount();
      }
    });
  }

  it('presents the budget as a real table that adds up', () => {
    render(<PlanResults response={planResponseFor(request())} />);
    const table = screen.getByRole('table', { name: 'Budget split by category' });

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Category', 'Share', 'Amount']);
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.at(-1)).toHaveTextContent('Total');
    expect(rows.at(-1)).toHaveTextContent('₹9,00,000');
    expect(within(table).getByRole('rowheader', { name: /Catering/ })).toHaveTextContent(
      'Priority',
    );
  });

  it('keeps the decorative share bars out of the accessibility tree', () => {
    const { container } = render(<PlanResults response={planResponseFor(request())} />);
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    const bars = container.querySelectorAll('progress');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute('aria-hidden', 'true');
  });

  it('never relies on colour alone: urgent and compressed work carries a text label', () => {
    render(<PlanResults response={planResponseFor(request({ eventDate: dateInDays(14) }))} />);
    expect(screen.getAllByText('Urgent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getByRole('note')).toHaveTextContent(/Only 14 days remain/);
  });

  it('shows no compression notice when there is plenty of time', () => {
    render(<PlanResults response={planResponseFor(request({ eventDate: dateInDays(400) }))} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
  });

  it('groups the timeline by phase, in order, with machine-readable dates', () => {
    const { container } = render(<PlanResults response={planResponseFor(request())} />);
    const timeline = within(container.querySelector<HTMLElement>('#timeline')!);
    const phases = timeline.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);

    expect(phases[0]).toBe('Foundation');
    expect(phases.at(-1)).toBe('Afterwards');
    expect([...phases]).toEqual(
      ['Foundation', 'Booking', 'Details', 'Final countdown', 'Event day', 'Afterwards'].filter(
        (phase) => phases.includes(phase),
      ),
    );
    for (const time of container.querySelectorAll('#timeline time')) {
      expect(time.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('lets the host tick off vendors and announces the count politely', async () => {
    const user = userEvent.setup();
    render(<PlanResults response={planResponseFor(request())} />);
    const vendors = screen.getByRole('heading', { name: 'Vendor checklist' }).closest('section')!;
    const status = within(vendors).getByRole('status');
    const boxes = within(vendors).getAllByRole('checkbox');

    expect(status).toHaveTextContent(`0 of ${boxes.length} booked`);
    await user.click(within(vendors).getByRole('checkbox', { name: 'Booked: Venue' }));
    expect(status).toHaveTextContent(`1 of ${boxes.length} booked`);
    expect(within(vendors).getByRole('checkbox', { name: 'Booked: Venue' })).toBeChecked();

    await user.click(within(vendors).getByRole('checkbox', { name: 'Booked: Venue' }));
    expect(status).toHaveTextContent(`0 of ${boxes.length} booked`);
  });

  it('tailors vendor questions to the host’s context and tucks them into disclosures', async () => {
    const user = userEvent.setup();
    render(<PlanResults response={planResponseFor(request())} />);
    const summary = screen.getAllByText(/Questions to ask/)[0]!;
    const details = summary.closest('details')!;

    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/weather backup/i)).toBeInTheDocument();
    expect(screen.getByText(/chairs with arms/i)).toBeInTheDocument();
  });

  it('offers printing', async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<PlanResults response={planResponseFor(request())} />);

    await user.click(screen.getByRole('button', { name: 'Print or save as PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('links to each section from a labelled navigation', () => {
    render(<PlanResults response={planResponseFor(request())} />);
    const nav = screen.getByRole('navigation', { name: 'Plan sections' });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['#feasibility', '#budget', '#timeline', '#vendors', '#ideas']);
    for (const href of hrefs) {
      expect(document.querySelector(String(href))).not.toBeNull();
    }
  });

  it('states who wrote the ideas', () => {
    const { rerender } = render(<PlanResults response={planResponseFor(request(), 'fallback')} />);
    expect(screen.getByText(/Built-in suggestions/)).toBeInTheDocument();
    expect(screen.queryByText(/Gemini/)).not.toBeInTheDocument();

    rerender(<PlanResults response={planResponseFor(request(), 'gemini')} />);
    expect(screen.getByText(/Written for you by Gemini/)).toBeInTheDocument();
  });
});

describe('FeasibilityCard', () => {
  it.each([
    [2_000_000, 'Comfortable'],
    [300_000, 'Tight'],
    [100_000, 'At risk'],
  ])('budget %i is described in words as "%s"', (budget, label) => {
    const { plan } = planResponseFor(request({ budget }));
    render(<FeasibilityCard feasibility={plan.feasibility} currency="INR" />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Is the budget realistic?' })).toBeInTheDocument();
  });
});
