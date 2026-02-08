import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { darkTheme } from 'thirdweb/react';
import type { Wallet } from 'thirdweb/wallets';

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export const wallets: Wallet[] = [
  inAppWallet({
    auth: { options: ['email', 'google', 'apple', 'passkey'] },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('walletConnect'),
];

export const walletTheme = darkTheme({
  colors: {
    primaryButtonBg: '#6366F1',
    primaryButtonText: '#ffffff',
    connectedButtonBg: '#1A1A1A',
    connectedButtonBgHover: '#262626',
    borderColor: '#262626',
    accentButtonBg: '#6366F1',
    accentButtonText: '#ffffff',
    accentText: '#818CF8',
    modalBg: '#121212',
    primaryText: '#FAFAFA',
    secondaryText: '#A3A3A3',
  },
});

export const connectButtonStyle = {
  borderRadius: '999px',
  fontSize: '14px',
  fontWeight: '600',
  height: '36px',
  paddingLeft: '16px',
  paddingRight: '16px',
} as const;

export const detailsButtonStyle = {
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: '500',
  height: '36px',
  paddingLeft: '14px',
  paddingRight: '14px',
  border: '1px solid #262626',
  background: '#1A1A1A',
  minWidth: 'auto',
  padding: '0 14px',
  gap: '6px',
} as const;

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
