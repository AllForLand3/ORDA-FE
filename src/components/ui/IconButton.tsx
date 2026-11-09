import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'size' | 'aria-label'
> {
  'aria-label': string;
  children: ReactNode;
  size?: 'sm' | 'md';
  variant?: 'plain' | 'outlined' | 'filled';
}

export function IconButton({
  children,
  className,
  size = 'md',
  type = 'button',
  variant = 'plain',
  ...props
}: IconButtonProps) {
  const classes = [
    'orda-icon-button',
    `orda-icon-button--${size}`,
    `orda-icon-button--${variant}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
