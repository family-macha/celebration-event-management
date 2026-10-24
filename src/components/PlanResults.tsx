import type { Ref } from 'react';

import type { PlanResponse } from '@/lib/domain/types';
import { describeDaysFromToday, formatDate, formatMoney } from '@/lib/format';

import { BudgetTable } from './BudgetTable';
import { FeasibilityCard } from './FeasibilityCard';
import { IdeasPanel } from './IdeasPanel';
import { EVENT_TITLE, SETTING_LABEL } from './labels';
import { TimelineList } from './TimelineList';
import { VendorChecklist } from './VendorChecklist';

interface PlanResultsProps {
  readonly response: PlanResponse;
  /** Lets the parent move focus here when a new plan arrives. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

const SECTION_LINKS: readonly { readonly href: string; readonly label: string }[] = [
  { href: '#feasibility', label: 'Budget check' },
  { href: '#budget', label: 'Budget' },
  { href: '#timeline', label: 'Timeline' },
  { href: '#vendors', label: 'Vendors' },
  { href: '#ideas', label: 'Ideas' },
];

export function PlanResults({ response, headingRef }: PlanResultsProps) {
  const { plan, ideas, ideasSource } = response;
  const { summary } = plan;

  return (
    <section id="results" aria-labelledby="results-heading" className="results">
      <h2 id="results-heading" tabIndex={-1} ref={headingRef}>
        Your {EVENT_TITLE[summary.eventType]} plan
      </h2>
      <p className="summary">
        {formatDate(summary.eventDate)} ({describeDaysFromToday(summary.daysUntilEvent)}) ·{' '}
        {summary.guestCount.toLocaleString('en-US')} guests ·{' '}
        {formatMoney(summary.budget, summary.currency)} · {SETTING_LABEL[summary.venueSetting]}
      </p>

      <nav aria-label="Plan sections" className="no-print">
        <ul className="jump-links">
          {SECTION_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <FeasibilityCard feasibility={plan.feasibility} currency={summary.currency} />
      <BudgetTable
        lines={plan.budgetLines}
        total={summary.budget}
        currency={summary.currency}
        contingencyRate={plan.contingencyRate}
      />
      <TimelineList tasks={plan.timeline.tasks} notice={plan.timeline.notice} />
      <VendorChecklist vendors={plan.vendors} currency={summary.currency} />
      <IdeasPanel ideas={ideas} source={ideasSource} />

      <p className="no-print">
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            window.print();
          }}
        >
          Print or save as PDF
        </button>
      </p>
    </section>
  );
}
