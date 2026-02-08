'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-sans)',
        },
        className: 'text-sm',
      }}
      richColors
      closeButton
    />
  );
}
