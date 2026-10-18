import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'error';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={['orda-badge', `orda-badge--${variant}`, className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
