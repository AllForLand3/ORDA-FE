import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = '닫기',
}: DialogProps) {
  const generatedId = useId().replaceAll(':', '');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onOpenChange(false);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onOpenChange(false);
  };

  return (
    <dialog
      aria-describedby={description ? `orda-dialog-description-${generatedId}` : undefined}
      aria-labelledby={`orda-dialog-title-${generatedId}`}
      className="orda-dialog"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
    >
      <div className="orda-dialog__surface">
        <header className="orda-dialog__header">
          <div>
            <h2 className="orda-dialog__title" id={`orda-dialog-title-${generatedId}`}>
              {title}
            </h2>
            {description ? (
              <p className="orda-dialog__description" id={`orda-dialog-description-${generatedId}`}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="plain"
          >
            <span aria-hidden="true">×</span>
          </IconButton>
        </header>
        <div className="orda-dialog__content">{children}</div>
        {footer ? <footer className="orda-dialog__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
