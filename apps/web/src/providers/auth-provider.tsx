'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveAccount, useActiveWalletConnectionStatus } from 'thirdweb/react';
import { toast } from 'sonner';
import { checkSession, logout as logoutFn, type AuthMeResponse } from '@/lib/auth';
import { getToken, clearToken, onTokenCleared } from '@/lib/token-store';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  isOnboarded: boolean | null;
  user: AuthMeResponse | null;
  handleLogin: (jwt: string, address: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_CHANNEL = 'autoclaw-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const activeAccount = useActiveAccount();
  const walletStatus = useActiveWalletConnectionStatus();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthMeResponse | null>(null);
  const sessionChecked = useRef(false);

  const resetState = useCallback(() => {
    setIsAuthenticated(false);
    setWalletAddress(null);
    setIsOnboarded(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    try {
      const me = await checkSession();
      if (me) {
        setIsAuthenticated(true);
        setWalletAddress(me.wallet_address);
        setIsOnboarded(me.onboarding_completed);
        setUser(me);
      } else {
        resetState();
      }
    } catch {
      resetState();
    }
  }, [resetState]);

  const handleLogin = useCallback(
    async (_jwt: string, address: string) => {
      setWalletAddress(address);
      setIsAuthenticated(true);
      await refreshSession();
      new BroadcastChannel(AUTH_CHANNEL).postMessage({ type: 'login' });
    },
    [refreshSession],
  );

  const handleLogout = useCallback(async () => {
    await logoutFn();
    resetState();
    new BroadcastChannel(AUTH_CHANNEL).postMessage({ type: 'logout' });
  }, [resetState]);

  // Wait for thirdweb wallet status to settle before checking session.
  // "connecting" = auto-connect in progress; once it resolves to
  // "connected" or "disconnected" we know the wallet state.
  useEffect(() => {
    if (walletStatus === 'connecting') return; // still resolving
    if (sessionChecked.current) return; // already ran
    sessionChecked.current = true;

    const token = getToken();
    if (token && activeAccount) {
      // Wallet connected + JWT exists — validate the session
      refreshSession().finally(() => setIsLoading(false));
    } else {
      // No wallet or no token — clear any stale JWT
      if (token && !activeAccount) {
        clearToken();
      }
      setIsLoading(false);
    }
  }, [walletStatus, activeAccount, refreshSession]);

  // Listen for 401-triggered token clears
  useEffect(() => {
    onTokenCleared(() => {
      resetState();
      toast.error('Session expired. Please reconnect.');
    });
  }, [resetState]);

  // Cross-tab auth synchronization
  useEffect(() => {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') {
        resetState();
      } else if (event.data?.type === 'login') {
        refreshSession();
      }
    };
    return () => channel.close();
  }, [resetState, refreshSession]);

  // Sync with thirdweb wallet state: if the wallet disconnects after being
  // connected, clear the auth state. Don't clear during auto-reconnect.
  const hadAccount = useRef(false);
  useEffect(() => {
    if (activeAccount) {
      hadAccount.current = true;
    } else if (hadAccount.current && isAuthenticated && walletStatus === 'disconnected') {
      // Only clear if wallet is explicitly disconnected, not during 'connecting' phase
      hadAccount.current = false;
      clearToken();
      resetState();
    }
  }, [activeAccount, isAuthenticated, walletStatus, resetState]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        walletAddress,
        isOnboarded,
        user,
        handleLogin,
        handleLogout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
