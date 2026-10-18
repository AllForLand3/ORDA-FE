import type { ReactNode } from 'react';

import './map-layout.css';

export interface ResponsivePanelProps {
  children: ReactNode;
  footer?: ReactNode;
  id: string;
  isOpen: boolean;
  label: string;
  onOpenChange: (isOpen: boolean) => void;
  size?: 'content' | 'expanded';
}

export function ResponsivePanel({
  children,
  footer,
  id,
  isOpen,
  label,
  onOpenChange,
  size = 'content',
}: ResponsivePanelProps) {
  return (
    <div className="orda-responsive-panel" data-panel-open={isOpen} data-panel-size={size}>
      <aside aria-label={label} className="orda-responsive-panel__surface" hidden={!isOpen} id={id}>
        <button
          aria-controls={id}
          aria-expanded={isOpen}
          aria-label="패널 접기"
          className="orda-responsive-panel__toggle orda-responsive-panel__toggle--close"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <span aria-hidden="true" className="orda-responsive-panel__handle" />
          <span className="orda-responsive-panel__toggle-text">패널 접기</span>
        </button>
        <div className="orda-responsive-panel__content">{children}</div>
        {footer ? <footer className="orda-responsive-panel__footer">{footer}</footer> : null}
      </aside>
      <button
        aria-controls={id}
        aria-expanded={isOpen}
        className="orda-responsive-panel__toggle orda-responsive-panel__toggle--open"
        hidden={isOpen}
        onClick={() => onOpenChange(true)}
        type="button"
      >
        패널 펼치기
      </button>
    </div>
  );
}
