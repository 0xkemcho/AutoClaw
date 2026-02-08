import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { lightTheme } from 'thirdweb/react';
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

export const walletTheme = lightTheme({
  colors: {
    primaryButtonBg: '#000000',
    primaryButtonText: '#ffffff',
    connectedButtonBg: '#ffffff',
    connectedButtonBgHover: '#f5f5f5',
    borderColor: '#e5e5e5',
    accentButtonBg: '#000000',
    accentButtonText: '#ffffff',
    accentText: '#000000',
    modalBg: '#ffffff',
    primaryText: '#000000',
    secondaryText: '#737373',
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
  border: '1px solid #e5e5e5',
  background: '#ffffff',
  minWidth: 'auto',
  padding: '0 14px',
  gap: '6px',
} as const;

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
