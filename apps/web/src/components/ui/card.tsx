'use client';

import { type HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-card-lg p-6 bg-background-card border border-border text-foreground ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
