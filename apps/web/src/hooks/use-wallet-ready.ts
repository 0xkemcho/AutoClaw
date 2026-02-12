'use client';

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';

/**
 * Wraps useActiveAccount() to distinguish hydration from genuine no-wallet state.
 * Returns { account, isHydrating } where isHydrating is true while thirdweb
 * is still initializing (prevents flashing "Connect Wallet" for returning users).
 */
export function useWalletReady() {
  const account = useActiveAccount();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    if (account) {
      setIsHydrating(false);
      return;
    }

    // Give thirdweb time to restore the session before concluding no wallet
    const timeout = setTimeout(() => setIsHydrating(false), 800);
    return () => clearTimeout(timeout);
  }, [account]);

  return { account, isHydrating };
}
