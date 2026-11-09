import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  ariaLabel: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ items, ariaLabel, value, defaultValue, onValueChange }: TabsProps) {
  const generatedId = useId().replaceAll(':', '');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () =>
      items.find((item) => item.value === defaultValue && !item.disabled)?.value ??
      items.find((item) => !item.disabled)?.value ??
      '',
  );
  const activeValue = value ?? uncontrolledValue;
  const selectedItem = items.find((item) => item.value === activeValue && !item.disabled);

  const selectValue = (nextValue: string) => {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const enabledItems = items.filter((item) => !item.disabled);
    if (!enabledItems.length) return;

    const currentIndex = enabledItems.findIndex(
      (item) => item.value === event.currentTarget.dataset.value,
    );
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledItems.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = enabledItems.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextItem = enabledItems[nextIndex];
    const nextTab = Array.from(
      tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    ).find((tab) => tab.dataset.value === nextItem.value);
    nextTab?.focus();
    selectValue(nextItem.value);
  };

  return (
    <div className="orda-tabs">
      <div aria-label={ariaLabel} className="orda-tabs__list" role="tablist" ref={tabsRef}>
        {items.map((item) => {
          const selected = selectedItem?.value === item.value;
          const tabId = `orda-tab-${generatedId}-${item.value}`;
          const panelId = `orda-tabpanel-${generatedId}-${item.value}`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              className="orda-tabs__tab"
              data-value={item.value}
              disabled={item.disabled}
              id={tabId}
              key={item.value}
              onClick={() => selectValue(item.value)}
              onKeyDown={onTabKeyDown}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          aria-labelledby={`orda-tab-${generatedId}-${item.value}`}
          className="orda-tabs__panel"
          hidden={selectedItem?.value !== item.value}
          id={`orda-tabpanel-${generatedId}-${item.value}`}
          key={item.value}
          role="tabpanel"
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
