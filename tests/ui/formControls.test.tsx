import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceGroup } from '@/components/ChoiceGroup';
import { ErrorSummary } from '@/components/ErrorSummary';
import { Field } from '@/components/Field';

import { accessibilityViolations } from './support';

describe('Field', () => {
  it('connects the label, hint and error to the control', async () => {
    const { container } = render(
      <Field id="f" label="Budget" hint="Whole numbers." error="Too small.">
        {(control) => <input {...control} name="budget" />}
      </Field>,
    );
    const input = screen.getByLabelText('Budget');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Whole numbers. Error: Too small.');
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('adds no ARIA noise when there is nothing to describe', () => {
    render(
      <Field id="f" label="Name">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks optional fields in the label', () => {
    render(
      <Field id="f" label="City" optional>
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText('City (optional)')).toBeInTheDocument();
  });
});

describe('ChoiceGroup', () => {
  const options = [
    { value: 'a', label: 'Alpha', hint: 'First' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders radios in a fieldset and reports the chosen value when controlled', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <ChoiceGroup
        name="kind"
        legend="Kind"
        type="radio"
        firstInputId="kind"
        options={options}
        selectedValue="a"
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole('group', { name: 'Kind' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Alpha/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Beta' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('honours a default value when uncontrolled', () => {
    render(
      <ChoiceGroup
        name="kind"
        legend="Kind"
        type="radio"
        firstInputId="kind"
        options={options}
        defaultValue="b"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
  });

  it('gives the first input the id that error links point to, and describes the group', () => {
    render(
      <ChoiceGroup
        name="kind"
        legend="Kind"
        type="checkbox"
        optional
        firstInputId="field-kind"
        hint="Pick any."
        error="Pick fewer."
        options={options}
      />,
    );
    expect(document.getElementById('field-kind')).toBe(
      screen.getByRole('checkbox', { name: /Alpha/ }),
    );
    expect(screen.getByRole('group', { name: /Kind/ })).toHaveAccessibleDescription(
      'Pick any. Error: Pick fewer.',
    );
    expect(screen.getByText('(optional)', { exact: false })).toBeInTheDocument();
  });
});

describe('ErrorSummary', () => {
  it('lists problems with links to fields, and plain text for form-level problems', () => {
    render(
      <ErrorSummary
        title="There are 2 things to fix"
        items={[
          { field: 'budget', message: 'Budget: too small.' },
          { message: 'Try again later.' },
        ]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveAccessibleName('There are 2 things to fix');
    expect(screen.getByRole('link', { name: 'Budget: too small.' })).toHaveAttribute(
      'href',
      '#field-budget',
    );
    expect(screen.getByText('Try again later.').closest('a')).toBeNull();
  });

  it('does not break if the field it points to is not on the page', async () => {
    const user = userEvent.setup();
    render(
      <ErrorSummary title="Fix" items={[{ field: 'budget', message: 'Budget: too small.' }]} />,
    );
    await expect(user.click(screen.getByRole('link'))).resolves.toBeUndefined();
  });
});
