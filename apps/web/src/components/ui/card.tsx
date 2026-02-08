'use client';

import { type HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'dark';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-background-card border border-border text-foreground',
  dark: 'bg-dark-card text-dark-card-text',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-card-lg p-6 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
