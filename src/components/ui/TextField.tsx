import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import filterIcon from '@/assets/icons/filter.svg';
import mailIcon from '@/assets/icons/mail.svg';
import searchIcon from '@/assets/icons/search.svg';

import { IconButton } from './IconButton';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-describedby' | 'aria-invalid' | 'id' | 'size' | 'type'
> {
  label: string;
  id?: string;
  type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url';
  variant?: 'default' | 'search';
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  startIcon?: 'mail' | 'search';
  helperText?: string;
  error?: string;
  invalid?: boolean;
  hideLabel?: boolean;
  onFilterClick?: () => void;
  filterLabel?: string;
  'aria-describedby'?: string;
}

export function TextField({
  'aria-describedby': describedBy,
  className,
  endAdornment,
  error,
  filterLabel = '검색 조건 열기',
  helperText,
  hideLabel = false,
  id: providedId,
  invalid = false,
  label,
  onFilterClick,
  startAdornment,
  startIcon,
  type,
  variant = 'default',
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId().replaceAll(':', '');
  const id = providedId ?? `orda-field-${generatedId}`;
  const helperId = `${id}-help`;
  const errorId = `${id}-error`;
  const effectiveType = type ?? (variant === 'search' ? 'search' : 'text');
  const icon = startIcon ?? (variant === 'search' ? 'search' : undefined);
  const adornment =
    startAdornment ??
    (icon === 'mail' ? (
      <img alt="" aria-hidden="true" className="orda-field__icon" src={mailIcon} />
    ) : icon === 'search' ? (
      <img alt="" aria-hidden="true" className="orda-field__icon" src={searchIcon} />
    ) : null);
  const isInvalid = invalid || Boolean(error);
  const descriptionIds = [
    describedBy,
    helperText ? helperId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const shellClasses = [
    'orda-input-shell',
    `orda-input-shell--${variant}`,
    isInvalid ? 'orda-input-shell--invalid' : '',
    inputProps.disabled ? 'orda-input-shell--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="orda-field">
      <label className={hideLabel ? 'orda-field__label sr-only' : 'orda-field__label'} htmlFor={id}>
        {label}
      </label>
      <div className={shellClasses}>
        {adornment ? <span className="orda-input-shell__start">{adornment}</span> : null}
        <input
          className={['orda-text-field', className ?? ''].filter(Boolean).join(' ')}
          id={id}
          type={effectiveType}
          aria-describedby={descriptionIds || undefined}
          aria-invalid={isInvalid || undefined}
          {...inputProps}
        />
        {endAdornment ? <span className="orda-input-shell__end">{endAdornment}</span> : null}
        {!endAdornment && onFilterClick ? (
          <IconButton
            aria-label={filterLabel}
            className="orda-input-shell__filter"
            onClick={onFilterClick}
            size="sm"
          >
            <img alt="" aria-hidden="true" className="orda-field__icon" src={filterIcon} />
          </IconButton>
        ) : null}
      </div>
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
