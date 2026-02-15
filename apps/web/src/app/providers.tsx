'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThirdwebProvider, AutoConnect } from 'thirdweb/react';
import { celo } from 'thirdweb/chains';
import { client, wallets } from '@/lib/thirdweb';
import { AuthProvider } from '@/providers/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <ThirdwebProvider>
          {client && (
            <AutoConnect
              client={client}
              wallets={wallets}
              chain={celo}
            />
          )}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
