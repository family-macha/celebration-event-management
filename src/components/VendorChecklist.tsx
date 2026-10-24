'use client';

import { useState } from 'react';

import type { CategoryId, Currency, VendorItem } from '@/lib/domain/types';
import { describeDaysFromToday, formatDate, formatMoney } from '@/lib/format';

import { STATUS_LABEL } from './labels';

interface VendorChecklistProps {
  readonly vendors: readonly VendorItem[];
  readonly currency: Currency;
}

export function VendorChecklist({ vendors, currency }: VendorChecklistProps) {
  const [booked, setBooked] = useState<ReadonlySet<CategoryId>>(new Set());

  function toggle(categoryId: CategoryId): void {
    setBooked((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  return (
    <section id="vendors" aria-labelledby="vendors-heading">
      <h3 id="vendors-heading">Vendor checklist</h3>
      <p className="hint" role="status">
        {booked.size} of {vendors.length} booked
      </p>
      <ul className="vendor-list">
        {vendors.map((vendor) => {
          const checkboxId = `vendor-${vendor.categoryId}`;
          return (
            <li key={vendor.categoryId} className="vendor">
              <div className="vendor-head">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={booked.has(vendor.categoryId)}
                  onChange={() => {
                    toggle(vendor.categoryId);
                  }}
                />
                <label htmlFor={checkboxId}>
                  <span className="visually-hidden">Booked:</span>{' '}
                  <span className="vendor-name">{vendor.label}</span>
                </label>
              </div>
              <p className="vendor-meta">
                Budget {formatMoney(vendor.budget, currency)}. Book by{' '}
                <time dateTime={vendor.bookBy}>{formatDate(vendor.bookBy)}</time>{' '}
                <span className="muted">({describeDaysFromToday(vendor.daysFromToday)})</span>
                {vendor.status !== 'on_track' ? (
                  <span className={`badge badge-${vendor.status}`}>
                    {STATUS_LABEL[vendor.status]}
                  </span>
                ) : null}
                {vendor.essential ? <span className="badge badge-critical">Essential</span> : null}
              </p>
              <details>
                <summary>Questions to ask ({vendor.questions.length})</summary>
                <ul>
                  {vendor.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
