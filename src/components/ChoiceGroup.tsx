export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

interface ChoiceGroupProps {
  readonly name: string;
  readonly legend: string;
  readonly type: 'radio' | 'checkbox';
  readonly options: readonly ChoiceOption[];
  /** Id given to the first input; the rest derive from it. Targeted by error links. */
  readonly firstInputId: string;
  readonly hint?: string;
  readonly error?: string | undefined;
  readonly required?: boolean;
  readonly optional?: boolean;
  /** Radio groups are controlled so other fields can react to the choice. */
  readonly selectedValue?: string | null;
  readonly onValueChange?: (value: string) => void;
  /** Initially selected value for an uncontrolled group. */
  readonly defaultValue?: string;
}

/**
 * A group of radio buttons or checkboxes inside a `<fieldset>`, so assistive
 * technology announces the group's legend with every option.
 */
export function ChoiceGroup({
  name,
  legend,
  type,
  options,
  firstInputId,
  hint,
  error,
  required,
  optional,
  selectedValue,
  onValueChange,
  defaultValue,
}: ChoiceGroupProps) {
  const hintId = hint ? `${firstInputId}-hint` : undefined;
  const errorId = error ? `${firstInputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset className={error ? 'field field-has-error' : 'field'} aria-describedby={describedBy}>
      <legend>
        {legend}
        {optional ? <span className="optional"> (optional)</span> : null}
      </legend>
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
      <div className="choices">
        {options.map((option, index) => {
          const id = index === 0 ? firstInputId : `${firstInputId}-${index}`;
          const controlled = type === 'radio' && selectedValue !== undefined;
          return (
            <div className="choice" key={option.value}>
              <input
                id={id}
                type={type}
                name={name}
                value={option.value}
                required={type === 'radio' ? required : undefined}
                {...(controlled
                  ? {
                      checked: selectedValue === option.value,
                      onChange: () => {
                        onValueChange?.(option.value);
                      },
                    }
                  : { defaultChecked: option.value === defaultValue })}
              />
              <label htmlFor={id}>
                {option.label}
                {option.hint ? <span className="choice-hint">{option.hint}</span> : null}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
