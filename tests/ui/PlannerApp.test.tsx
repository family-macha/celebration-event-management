import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlannerApp } from '@/components/PlannerApp';

import { accessibilityViolations, dateInDays, planResponseFor, stubFetch } from './support';

afterEach(() => {
  vi.unstubAllGlobals();
});

const buildButton = () => screen.getByRole('button', { name: /build my plan|building your plan/i });

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /^Wedding/ }));
  fireEvent.change(screen.getByLabelText('Event date'), { target: { value: dateInDays(120) } });
  await user.type(screen.getByLabelText('Number of guests'), '150');
  await user.type(screen.getByLabelText('Total budget'), '15,00,000');
}

describe('the planning form', () => {
  it('starts as a labelled, accessible form with nothing preselected except sensible defaults', async () => {
    const { container } = render(<PlannerApp />);

    expect(screen.getByRole('heading', { level: 2, name: 'Plan your event' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Not decided yet/ })).toBeChecked();
    expect(screen.getByLabelText('Currency')).toHaveValue('INR');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('offers only the priorities that apply to the chosen kind of event', async () => {
    const user = userEvent.setup();
    render(<PlannerApp />);
    const priorities = () =>
      within(screen.getByRole('group', { name: /What matters most/ })).queryAllByRole('checkbox');

    expect(priorities()).toHaveLength(0);
    expect(screen.getByText(/Choose the type of event first/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^Wedding/ }));
    expect(priorities()).toHaveLength(6);

    await user.click(screen.getByRole('radio', { name: /^Community event/ }));
    const names = priorities().map((box) => box.getAttribute('value'));
    expect(names).not.toContain('photography');
    expect(names).not.toContain('decor');
    expect(names).toContain('guest_comfort');

    await user.click(screen.getByRole('radio', { name: /^Birthday/ }));
    expect(priorities().map((box) => box.getAttribute('value'))).not.toContain('guest_comfort');
  });
});

describe('validation feedback', () => {
  it('tells keyboard and screen-reader users what is wrong, and does not call the server', async () => {
    const user = userEvent.setup();
    const fetchStub = stubFetch();
    const { container } = render(<PlannerApp />);

    await user.click(buildButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(within(summary).getByRole('heading', { level: 2 })).toHaveTextContent(
      'There are 4 things to fix',
    );
    const links = within(summary).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Type of event: Choose a type of event.',
      'Event date: Choose the event date.',
      'Number of guests: Enter the number of guests as a whole number.',
      'Total budget: Enter your total budget as a whole number.',
    ]);
    expect(fetchStub).not.toHaveBeenCalled();

    // Each message is also tied to its control.
    const guests = screen.getByLabelText('Number of guests');
    expect(guests).toHaveAttribute('aria-invalid', 'true');
    expect(guests).toHaveAccessibleDescription(/Error: Enter the number of guests/);
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('moves focus into the field when an error link is followed', async () => {
    const user = userEvent.setup();
    render(<PlannerApp />);
    await user.click(buildButton());

    await user.click(await screen.findByRole('link', { name: /Total budget/ }));
    expect(screen.getByLabelText('Total budget')).toHaveFocus();

    await user.click(screen.getByRole('link', { name: /Type of event/ }));
    expect(screen.getByRole('radio', { name: /^Wedding/ })).toHaveFocus();
  });

  it('uses the same rules as the server, with specific wording', async () => {
    const user = userEvent.setup();
    render(<PlannerApp />);
    await user.click(screen.getByRole('radio', { name: /^Birthday/ }));
    fireEvent.change(screen.getByLabelText('Event date'), { target: { value: dateInDays(-5) } });
    await user.type(screen.getByLabelText('Number of guests'), 'about 50');
    await user.type(screen.getByLabelText('Total budget'), '12.5');
    await user.type(screen.getByLabelText(/^City/), '<b>Paris</b>');
    await user.click(buildButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/Choose a date after/);
    expect(summary).toHaveTextContent(/Number of guests: Enter the number of guests/);
    expect(summary).toHaveTextContent(
      /Total budget: Budget must be a whole number, without decimals/,
    );
    expect(summary).toHaveTextContent(/City: Use letters/);
  });

  it('uses singular wording for a single problem', async () => {
    const user = userEvent.setup();
    render(<PlannerApp />);
    await user.click(screen.getByRole('radio', { name: /^Wedding/ }));
    fireEvent.change(screen.getByLabelText('Event date'), { target: { value: dateInDays(100) } });
    await user.type(screen.getByLabelText('Number of guests'), '100');
    await user.click(buildButton());
    expect(await screen.findByRole('heading', { name: 'There is 1 thing to fix' })).toBeVisible();
  });
});

describe('building a plan', () => {
  it('shows progress, then the plan, and moves focus to it', async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchStub = stubFetch(() => pending);
    render(<PlannerApp />);

    await fillValidForm(user);
    await user.click(buildButton());

    expect(buildButton()).toHaveAttribute('aria-disabled', 'true');
    expect(buildButton()).toHaveTextContent('Building your plan…');
    expect(screen.getByText(/This usually takes a few seconds/)).toBeInTheDocument();

    const body = JSON.parse(fetchStub.mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      eventType: 'wedding',
      guestCount: 150,
      budget: 1_500_000,
      currency: 'INR',
      venueSetting: 'either',
      priorities: [],
    });

    release(
      Response.json(
        planResponseFor({
          eventType: 'wedding',
          eventDate: dateInDays(120),
          guestCount: 150,
          budget: 1_500_000,
          currency: 'INR',
          venueSetting: 'either',
          priorities: [],
          dietaryNeeds: [],
          accessNeeds: [],
        }),
      ),
    );

    const heading = await screen.findByRole('heading', { level: 2, name: 'Your wedding plan' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(buildButton()).toHaveAttribute('aria-disabled', 'false');
    expect(buildButton()).toHaveTextContent('Build my plan');
  });

  it('shows a complete, accessible plan', async () => {
    const user = userEvent.setup();
    stubFetch();
    const { container } = render(<PlannerApp />);

    await fillValidForm(user);
    await user.click(screen.getByRole('radio', { name: /^Outdoors/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Vegetarian' }));
    await user.click(buildButton());

    await screen.findByRole('heading', { level: 2, name: 'Your wedding plan' });

    for (const name of [
      'Is the budget realistic?',
      'Budget breakdown',
      'Timeline',
      'Vendor checklist',
      'Personalised ideas',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByRole('table', { name: 'Budget split by category' })).toBeInTheDocument();
    expect(screen.getByText('Built-in suggestions chosen from your answers.')).toBeInTheDocument();
    expect(screen.getByText('₹15,00,000', { selector: 'td' })).toBeInTheDocument();
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('ignores a second submit while one is already running', async () => {
    const user = userEvent.setup();
    const pending = new Promise<Response>(() => undefined);
    const fetchStub = stubFetch(() => pending);
    render(<PlannerApp />);

    await fillValidForm(user);
    await user.click(buildButton());
    await user.click(buildButton());
    await user.keyboard('{Enter}');

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('replaces the old plan when the form is submitted again, and clears old errors', async () => {
    const user = userEvent.setup();
    stubFetch();
    render(<PlannerApp />);

    await user.click(buildButton());
    expect(await screen.findByRole('alert')).toBeVisible();

    await fillValidForm(user);
    await user.click(buildButton());
    await screen.findByRole('heading', { level: 2, name: 'Your wedding plan' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^Birthday/ }));
    await user.click(buildButton());
    await screen.findByRole('heading', { level: 2, name: 'Your birthday plan' });
    expect(screen.queryByRole('heading', { name: 'Your wedding plan' })).not.toBeInTheDocument();
  });

  it('says so when ideas were written by Gemini', async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      Response.json(
        planResponseFor(
          {
            eventType: 'wedding',
            eventDate: dateInDays(120),
            guestCount: 150,
            budget: 1_500_000,
            currency: 'INR',
            venueSetting: 'either',
            priorities: [],
            dietaryNeeds: [],
            accessNeeds: [],
          },
          'gemini',
        ),
      ),
    );
    render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());

    expect(await screen.findByText(/Written for you by Gemini/)).toBeInTheDocument();
  });
});

describe('when something goes wrong', () => {
  it('shows server-side field errors in the same accessible way', async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      Response.json(
        { error: { code: 'validation_failed', fieldErrors: { budget: 'Server says no.' } } },
        { status: 422 },
      ),
    );
    render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent('Total budget: Server says no.');
    expect(screen.getByLabelText('Total budget')).toHaveAccessibleDescription(/Server says no/);
  });

  it('asks the person to wait when rate limited', async () => {
    const user = userEvent.setup();
    stubFetch(() => Response.json({}, { status: 429, headers: { 'Retry-After': '17' } }));
    render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/wait about 17 seconds/);
    expect(within(summary).queryAllByRole('link')).toHaveLength(0);
  });

  it('explains a network failure without technical detail, and lets them try again', async () => {
    const user = userEvent.setup();
    const fetchStub = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', fetchStub);
    render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/could not reach the planner/i);
    expect(summary).not.toHaveTextContent(/Failed to fetch/);

    await user.click(buildButton());
    await waitFor(() => {
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });
  });

  it('shows a friendly message for a server error', async () => {
    const user = userEvent.setup();
    stubFetch(() => Response.json({ error: { code: 'internal_error' } }, { status: 500 }));
    render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(/Something went wrong/);
  });

  it('cancels an in-flight request when the page is left', async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, init) => {
        signal = init?.signal;
        return new Promise<Response>(() => undefined);
      }),
    );
    const { unmount } = render(<PlannerApp />);
    await fillValidForm(user);
    await user.click(buildButton());
    await waitFor(() => {
      expect(signal).toBeDefined();
    });

    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
