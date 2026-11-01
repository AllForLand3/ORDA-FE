import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

import './map-layout.css';

export interface ResponsivePanelProps {
  children: ReactNode;
  closeText?: string;
  footer?: ReactNode;
  id: string;
  isOpen: boolean;
  label: string;
  onOpenChange: (isOpen: boolean) => void;
  mobileResizable?: boolean;
  mobileSwipeToClose?: boolean;
  size?: 'content' | 'expanded';
}

export function ResponsivePanel({
  children,
  closeText,
  footer,
  id,
  isOpen,
  label,
  onOpenChange,
  mobileResizable = false,
  mobileSwipeToClose = false,
  size = 'content',
}: ResponsivePanelProps) {
  const effectiveCloseText = closeText ?? (mobileResizable ? '접기' : '패널 접기');
  const [isExpanded, setIsExpanded] = useState(false);
  const surfaceRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);
  const suppressClickRef = useRef(false);
  const hasMobileDragHandle = mobileResizable || mobileSwipeToClose;

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (
      !hasMobileDragHandle ||
      event.button !== 0 ||
      !event.isPrimary ||
      !window.matchMedia('(max-width: 47.999rem)').matches
    )
      return;
    const surface = surfaceRef.current;
    if (!surface) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: surface.getBoundingClientRect().height,
    };
    surface.dataset.dragging = 'true';
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 6) suppressClickRef.current = true;
    if (mobileSwipeToClose && !mobileResizable) {
      surfaceRef.current?.style.setProperty('--orda-panel-drag-offset', `${Math.max(0, delta)}px`);
    } else {
      surfaceRef.current?.style.setProperty(
        '--orda-panel-drag-height',
        `${drag.startHeight - delta}px`,
      );
    }
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 6) suppressClickRef.current = true;
    if (!cancelled) {
      if (mobileSwipeToClose && !mobileResizable) {
        if (delta >= 64) onOpenChange(false);
      } else if (Math.abs(delta) >= 48) {
        if (delta < 0) {
          setIsExpanded(true);
        } else if (isExpanded) {
          setIsExpanded(false);
        } else {
          onOpenChange(false);
        }
      }
    }
    if (surfaceRef.current) {
      surfaceRef.current.style.removeProperty('--orda-panel-drag-height');
      surfaceRef.current.style.removeProperty('--orda-panel-drag-offset');
      delete surfaceRef.current.dataset.dragging;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      className="orda-responsive-panel"
      data-panel-open={isOpen}
      data-panel-size={size}
      data-mobile-resizable={mobileResizable}
      data-mobile-swipe-to-close={mobileSwipeToClose}
      data-panel-height={isExpanded ? 'expanded' : 'compact'}
    >
      <aside
        aria-label={label}
        className="orda-responsive-panel__surface"
        hidden={!isOpen}
        id={id}
        ref={surfaceRef}
      >
        {hasMobileDragHandle ? (
          <div className="orda-responsive-panel__resize-bar">
            <button
              aria-controls={id}
              aria-expanded={mobileResizable ? isExpanded : isOpen}
              aria-label={
                mobileSwipeToClose && !mobileResizable
                  ? '패널을 아래로 밀어 접기'
                  : isExpanded
                    ? '패널 높이 줄이기'
                    : '패널 높이 늘리기'
              }
              className="orda-responsive-panel__resize-handle"
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                if (mobileResizable) setIsExpanded((expanded) => !expanded);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') suppressClickRef.current = false;
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (mobileSwipeToClose && !mobileResizable) {
                    if (event.key === 'ArrowDown') onOpenChange(false);
                  } else if (event.key === 'ArrowUp') {
                    setIsExpanded(true);
                  } else if (isExpanded) {
                    setIsExpanded(false);
                  } else {
                    onOpenChange(false);
                  }
                }
              }}
              onLostPointerCapture={(event) => finishDrag(event, true)}
              onPointerCancel={(event) => finishDrag(event, true)}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={(event) => finishDrag(event)}
              type="button"
            >
              <span aria-hidden="true" className="orda-responsive-panel__handle" />
            </button>
            <button
              aria-controls={id}
              aria-expanded={isOpen}
              aria-label="패널 접기"
              className="orda-responsive-panel__resize-close"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              {effectiveCloseText}
            </button>
          </div>
        ) : (
          <button
            aria-controls={id}
            aria-expanded={isOpen}
            aria-label="패널 접기"
            className="orda-responsive-panel__toggle orda-responsive-panel__toggle--close"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <span aria-hidden="true" className="orda-responsive-panel__handle" />
            <span className="orda-responsive-panel__toggle-text">{effectiveCloseText}</span>
          </button>
        )}
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
