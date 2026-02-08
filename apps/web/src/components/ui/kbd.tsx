import { type HTMLAttributes } from 'react';

interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ children, className = '', ...props }: KbdProps) {
  return (
    <kbd
      className={`pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background-secondary px-1.5 font-sans text-[11px] font-medium text-foreground-muted ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}
