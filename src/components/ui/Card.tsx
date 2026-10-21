import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
  return (
    <article
      className={['orda-card', `orda-card--${padding}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </article>
  );
}
