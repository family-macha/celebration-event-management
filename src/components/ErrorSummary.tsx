import type { MouseEvent, Ref } from 'react';

import type { PlanRequestField } from '@/lib/validation/planRequest';

import { FIELD_IDS } from './fieldIds';

export interface ErrorSummaryItem {
  readonly field?: PlanRequestField;
  readonly message: string;
}

interface ErrorSummaryProps {
  readonly title: string;
  readonly items: readonly ErrorSummaryItem[];
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Lists what needs fixing, above the form. It receives focus when it appears,
 * so screen-reader and keyboard users learn about the problem immediately,
 * and each item links to the field it describes.
 */
export function ErrorSummary({ title, items, ref }: ErrorSummaryProps) {
  function focusField(event: MouseEvent<HTMLAnchorElement>, field: PlanRequestField): void {
    const target = document.getElementById(FIELD_IDS[field]);
    if (target) {
      // A fragment link scrolls but does not reliably move focus into a form control.
      event.preventDefault();
      target.focus();
    }
  }

  return (
    <div
      ref={ref}
      className="error-summary"
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-title"
    >
      <h2 id="error-summary-title">{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={`${item.field ?? 'form'}-${item.message}`}>
            {item.field ? (
              <a
                href={`#${FIELD_IDS[item.field]}`}
                onClick={(event) => {
                  if (item.field) focusField(event, item.field);
                }}
              >
                {item.message}
              </a>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
