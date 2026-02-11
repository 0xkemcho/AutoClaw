import { createViemAccount } from '@privy-io/node/viem';
import { createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { getPrivyClient } from './privy';

/**
 * Create a new Privy server wallet for an agent user.
 * Returns the wallet ID and Ethereum address.
 * Uses idempotencyKey to prevent duplicate wallets.
 */
export async function createAgentWallet(userId: string) {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: 'ethereum',
    idempotency_key: `agent-${userId}`,
  });

  return {
    walletId: wallet.id,
    address: wallet.address,
  };
}

/**
 * Get a viem WalletClient that signs via Privy for the given wallet.
 * Requires both walletId (for Privy signing) and address (for viem account).
 */
export async function getAgentWalletClient(walletId: string, address: string) {
  const privy = getPrivyClient();
  const account = await createViemAccount(privy, {
    walletId,
    address: address as `0x${string}`,
  });

  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}
