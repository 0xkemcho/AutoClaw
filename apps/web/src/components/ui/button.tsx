'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'cta' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  cta: 'bg-cta text-cta-text hover:bg-cta-hover',
  secondary: 'bg-background-secondary text-foreground hover:bg-border',
  ghost: 'bg-transparent text-foreground hover:bg-background-secondary',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'cta', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`rounded-pill font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
