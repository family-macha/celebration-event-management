import type { ReactNode } from 'react';

interface ControlProps {
  readonly id: string;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': true | undefined;
}

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string | undefined;
  readonly optional?: boolean;
  /** Receives the id and ARIA wiring the control must carry. */
  readonly children: (control: ControlProps) => ReactNode;
}

/**
 * A labelled form control with optional hint and error text.
 *
 * The hint and error are tied to the control with `aria-describedby`, and the
 * error text starts with a visually hidden "Error:" so it is announced as one
 * even where colour or icons are not perceived.
 */
export function Field({ id, label, hint, error, optional, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={error ? 'field field-has-error' : 'field'}>
      <label htmlFor={id}>
        {label}
        {optional ? <span className="optional"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="error">
          <span className="visually-hidden">Error:</span> {error}
        </p>
      ) : null}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
    </div>
  );
}
