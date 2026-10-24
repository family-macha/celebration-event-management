import type { Currency, Feasibility } from '@/lib/domain/types';
import { formatMoney } from '@/lib/format';

import { FEASIBILITY_LABEL } from './labels';

interface FeasibilityCardProps {
  readonly feasibility: Feasibility;
  readonly currency: Currency;
}

/** The verdict is text first; colour only reinforces it. */
export function FeasibilityCard({ feasibility, currency }: FeasibilityCardProps) {
  return (
    <section
      id="feasibility"
      aria-labelledby="feasibility-heading"
      className={`card feasibility feasibility-${feasibility.level}`}
    >
      <h3 id="feasibility-heading">Is the budget realistic?</h3>
      <p className="verdict">
        <strong>{FEASIBILITY_LABEL[feasibility.level]}</strong>
        {': '}
        {formatMoney(feasibility.perGuest, currency)} per guest
      </p>
      <ul>
        {feasibility.advice.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
