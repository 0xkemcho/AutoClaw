'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { signLoginPayload } from 'thirdweb/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Performs the login flow: payload → sign → JWT → localStorage.
 * Returns the JWT token or null on failure.
 */
export async function performLogin(account: {
  address: string;
  signMessage: (args: { message: string }) => Promise<string>;
  [key: string]: unknown;
}): Promise<string | null> {
  try {
    // 1. Get login payload from backend
    const payloadRes = await fetch(`${API_URL}/api/auth/payload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: account.address }),
    });
    if (!payloadRes.ok) {
      console.warn('Auth payload request failed:', payloadRes.status);
      return null;
    }
    const loginPayload = await payloadRes.json();

    // 2. Sign the payload with the connected wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { signature, payload } = await signLoginPayload({
      account: account as any,
      payload: loginPayload,
    });

    // 3. Send signature to backend to get JWT
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, signature }),
    });
    if (!loginRes.ok) {
      console.warn('Auth login request failed:', loginRes.status);
      return null;
    }
    const { token } = await loginRes.json();

    if (token) {
      localStorage.setItem('auth_token', token);
      return token;
    }
    return null;
  } catch (err) {
    console.warn('Login failed:', err);
    return null;
  }
}

/**
 * Automatically authenticates with the backend when a wallet connects.
 * Also exposes ensureAuth() for on-demand login when needed.
 */
export function useAutoLogin() {
  const account = useActiveAccount();
  const loginAttempted = useRef<string | null>(null);
  const loginInProgress = useRef<Promise<string | null> | null>(null);
  const prevAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only clear token when user explicitly disconnects (had an address, now doesn't)
    // Don't clear on initial mount when account is still hydrating
    if (!account) {
      if (prevAddress.current) {
        localStorage.removeItem('auth_token');
        loginAttempted.current = null;
        loginInProgress.current = null;
      }
      prevAddress.current = undefined;
      return;
    }

    prevAddress.current = account.address;

    if (loginAttempted.current === account.address) return;
    loginAttempted.current = account.address;

    const existing = localStorage.getItem('auth_token');
    if (existing) return;

    loginInProgress.current = performLogin(account);
    loginInProgress.current.finally(() => {
      loginInProgress.current = null;
    });
  }, [account]);

  /**
   * Ensures we have a valid auth token. If one exists in localStorage, returns it.
   * Otherwise triggers the full login flow and waits for it to complete.
   */
  const ensureAuth = useCallback(async (): Promise<string | null> => {
    const existing = localStorage.getItem('auth_token');
    if (existing) return existing;

    // If login is already in progress, wait for it
    if (loginInProgress.current) {
      const result = await loginInProgress.current;
      if (result) return result;
    }

    // No token and no login in progress — try to login now
    if (account) {
      const token = await performLogin(account);
      return token;
    }

    return null;
  }, [account]);

  return { ensureAuth };
}
