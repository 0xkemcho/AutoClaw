'use client';

import { createContext, useContext, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThirdwebProvider } from 'thirdweb/react';
import { useAutoLogin } from '@/hooks/use-auto-login';

type EnsureAuthFn = () => Promise<string | null>;

const AuthContext = createContext<EnsureAuthFn>(async () => null);

export function useEnsureAuth() {
  return useContext(AuthContext);
}

function AutoLogin({ children }: { children: React.ReactNode }) {
  const { ensureAuth } = useAutoLogin();
  return (
    <AuthContext.Provider value={ensureAuth}>
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AutoLogin>{children}</AutoLogin>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
