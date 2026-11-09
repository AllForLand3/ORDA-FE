import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-describedby' | 'aria-invalid' | 'id' | 'type'
> {
  label: ReactNode;
  id?: string;
  description?: string;
  error?: string;
  'aria-describedby'?: string;
}

export function Checkbox({
  'aria-describedby': describedBy,
  className,
  description,
  error,
  id: providedId,
  label,
  ...inputProps
}: CheckboxProps) {
  const generatedId = useId().replaceAll(':', '');
  const id = providedId ?? `orda-checkbox-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const descriptionIds = [
    describedBy,
    description ? descriptionId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['orda-checkbox-field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="orda-checkbox" htmlFor={id}>
        <input
          className="orda-checkbox__input"
          id={id}
          type="checkbox"
          aria-describedby={descriptionIds || undefined}
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        <span aria-hidden="true" className="orda-checkbox__box" />
        <span className="orda-checkbox__label">{label}</span>
      </label>
      {description ? (
        <span className="orda-field__helper orda-checkbox-field__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      {error ? (
        <span className="orda-field__error orda-checkbox-field__description" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
