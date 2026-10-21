import { useId, type TextareaHTMLAttributes } from 'react';

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'aria-describedby' | 'aria-invalid' | 'id'
> {
  label: string;
  id?: string;
  helperText?: string;
  error?: string;
  invalid?: boolean;
  hideLabel?: boolean;
  'aria-describedby'?: string;
}

export function TextArea({
  'aria-describedby': describedBy,
  className,
  error,
  helperText,
  hideLabel = false,
  id: providedId,
  invalid = false,
  label,
  ...props
}: TextAreaProps) {
  const generatedId = useId().replaceAll(':', '');
  const id = providedId ?? `orda-textarea-${generatedId}`;
  const helperId = `${id}-help`;
  const errorId = `${id}-error`;
  const isInvalid = invalid || Boolean(error);
  const descriptionIds = [
    describedBy,
    helperText ? helperId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="orda-field">
      <label className={hideLabel ? 'orda-field__label sr-only' : 'orda-field__label'} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={[
          'orda-text-area',
          isInvalid ? 'orda-text-area--invalid' : '',
          props.disabled ? 'orda-text-area--disabled' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={isInvalid || undefined}
        {...props}
      />
      {helperText ? (
        <span className="orda-field__helper" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span className="orda-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
