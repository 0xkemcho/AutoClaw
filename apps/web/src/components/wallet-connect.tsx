'use client';

import { ConnectButton, darkTheme } from 'thirdweb/react';
import { celo } from 'thirdweb/chains';
import { client, wallets } from '@/lib/thirdweb';
import { generatePayload, login, checkSession } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';

const amberTheme = darkTheme({
  colors: {
    accentButtonBg: 'hsl(38 80% 60%)',
    accentButtonText: 'hsl(30 10% 8%)',
    primaryButtonBg: 'hsl(38 80% 60%)',
    primaryButtonText: 'hsl(30 10% 8%)',
    accentText: 'hsl(38 80% 65%)',
    modalBg: 'hsl(30 6% 7%)',
    borderColor: 'hsl(30 4% 14%)',
    connectedButtonBg: 'hsl(30 6% 10%)',
    connectedButtonBgHover: 'hsl(30 6% 14%)',
  },
});

export function WalletConnect() {
  const { handleLogin, handleLogout } = useAuth();

  if (!client) {
    return (
      <p className="text-sm text-muted-foreground">
        Wallet connection unavailable — set NEXT_PUBLIC_THIRDWEB_CLIENT_ID
      </p>
    );
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chain={celo}
      connectModal={{ size: 'compact' }}
      theme={amberTheme}
      connectButton={{ className: '!w-full justify-center' }}
      detailsButton={{ className: '!w-full justify-center' }}
      auth={{
        getLoginPayload: async ({ address }) => {
          const payload = await generatePayload({ address });
          return payload as any;
        },
        doLogin: async (params) => {
          const jwt = await login({
            payload: params.payload,
            signature: params.signature,
          });
          const address =
            typeof params.payload === 'object' &&
            params.payload !== null &&
            'address' in params.payload
              ? (params.payload as { address: string }).address
              : '';
          await handleLogin(jwt, address);
        },
        isLoggedIn: async () => {
          const session = await checkSession();
          return !!session;
        },
        doLogout: async () => {
          await handleLogout();
        },
      }}
    />
  );
}
