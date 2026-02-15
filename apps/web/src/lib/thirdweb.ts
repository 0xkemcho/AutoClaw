import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet, type Wallet } from 'thirdweb/wallets';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? '';

export const client: ReturnType<typeof createThirdwebClient> | null = clientId
  ? createThirdwebClient({ clientId })
  : null;

export const wallets: Wallet[] = [
  inAppWallet({
    auth: { options: ['email', 'google', 'apple', 'passkey'] },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('walletConnect'),
];
