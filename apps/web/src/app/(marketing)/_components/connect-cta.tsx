'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { useConnectModal } from 'thirdweb/react';
import { celo } from 'thirdweb/chains';
import { client, wallets } from '@/lib/thirdweb';
import { generatePayload, login, checkSession } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';

interface ConnectCTAProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  children: ReactNode;
}

export function ConnectCTA({ children, ...buttonProps }: ConnectCTAProps) {
  const { connect } = useConnectModal();
  const { handleLogin } = useAuth();

  const handleClick = async () => {
    if (!client) return;

    await connect({
      client,
      wallets,
      chain: celo,
      size: 'compact',
      auth: {
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
        doLogout: async () => {},
      },
    });
  };

  return (
    <Button
      onClick={handleClick}
      {...buttonProps}
      className={buttonProps.className}
    >
      {children}
    </Button>
  );
}
