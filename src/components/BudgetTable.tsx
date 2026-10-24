import type { BudgetLine, Currency } from '@/lib/domain/types';
import { formatMoney } from '@/lib/format';

interface BudgetTableProps {
  readonly lines: readonly BudgetLine[];
  readonly total: number;
  readonly currency: Currency;
  readonly contingencyRate: number;
}

export function BudgetTable({ lines, total, currency, contingencyRate }: BudgetTableProps) {
  return (
    <section id="budget" aria-labelledby="budget-heading">
      <h3 id="budget-heading">Budget breakdown</h3>
      <p className="hint">
        The lines add up exactly to your total. {Math.round(contingencyRate * 100)}% is held back as
        contingency.
      </p>
      <table>
        <caption className="visually-hidden">Budget split by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Share</th>
            <th scope="col" className="num">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.categoryId}>
              <th scope="row">
                {line.label}
                {line.boosted ? <span className="badge badge-priority">Priority</span> : null}
              </th>
              <td>
                <span className="share">{line.sharePercent}%</span>
                {/* Decorative: the percentage beside it carries the information. */}
                <progress value={line.sharePercent} max={100} aria-hidden="true" />
              </td>
              <td className="num">{formatMoney(line.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>100%</td>
            <td className="num">{formatMoney(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
