import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import './ui.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function findLastEnabledIndex(options: SelectOption[]): number {
  for (let index = options.length - 1; index >= 0; index--) {
    if (!options[index].disabled) {
      return index;
    }
  }

  return -1;
}

export function Select({
  options,
  value,
  onValueChange,
  ariaLabel,
  placeholder = '선택해주세요',
  disabled = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];

  function getNextEnabledIndex(start: number, step: 1 | -1) {
    if (options.length === 0) return -1;

    for (let i = 0; i < options.length; i++) {
      const index = (start + step * (i + 1) + options.length * 2) % options.length;

      if (!options[index].disabled) return index;
    }

    return -1;
  }

  function openSelect(direction: 'first' | 'last' | 'selected' = 'selected') {
    if (disabled || !options.some((option) => !option.disabled)) {
      return;
    }

    let index: number;

    if (direction === 'last') {
      index = findLastEnabledIndex(options);
    } else if (direction === 'first') {
      index = options.findIndex((option) => !option.disabled);
    } else if (selectedIndex >= 0 && !options[selectedIndex].disabled) {
      index = selectedIndex;
    } else {
      index = options.findIndex((option) => !option.disabled);
    }

    setFocusedIndex(index);
    setIsOpen(true);
  }

  function closeSelect(restoreFocus = true) {
    setIsOpen(false);
    setFocusedIndex(-1);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) return;

    onValueChange(option.value);
    closeSelect();
  }

  useEffect(() => {
    if (!isOpen) return;

    optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        closeSelect(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openSelect('selected');
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openSelect('last');
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSelect();
      return;
    }

    if (event.key === 'Tab') {
      closeSelect(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      const next = getNextEnabledIndex(focusedIndex, event.key === 'ArrowDown' ? 1 : -1);

      if (next !== -1) {
        setFocusedIndex(next);
      }

      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();

      const next =
        event.key === 'Home'
          ? options.findIndex((option) => !option.disabled)
          : findLastEnabledIndex(options);

      if (next !== -1) {
        setFocusedIndex(next);
      }
    }
  }

  return (
    <div className={`orda-select ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`orda-select__trigger${isOpen ? ' is-open' : ''}`}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closeSelect();
          } else {
            openSelect();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span className={!selectedOption ? 'is-placeholder' : ''}>
          {selectedOption?.label ?? placeholder}
        </span>

        <svg aria-hidden="true" className="orda-select__chevron" fill="none" viewBox="0 0 24 24">
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {isOpen && (
        <div aria-label={ariaLabel} className="orda-select__menu" id={listboxId} role="listbox">
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              aria-selected={value === option.value}
              className={`orda-select__option${value === option.value ? ' is-selected' : ''}`}
              disabled={option.disabled}
              onClick={() => selectOption(option)}
              onKeyDown={handleOptionKeyDown}
              role="option"
              tabIndex={index === focusedIndex ? 0 : -1}
              type="button"
            >
              <span>{option.label}</span>

              {value === option.value && (
                <svg
                  aria-hidden="true"
                  className="orda-select__check"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
