import { type HTMLAttributes } from 'react';

interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ children, className = '', ...props }: KbdProps) {
  return (
    <kbd
      className={`pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 font-sans text-[11px] font-medium text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}
