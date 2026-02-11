import { createAccount } from '@turnkey/viem';
import { createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { turnkeyClient, TURNKEY_ORGANIZATION_ID } from './turnkey';

/**
 * Create a new Turnkey wallet for an agent user.
 * Returns the Turnkey wallet ID and the Ethereum address.
 */
export async function createAgentWallet(userId: string) {
  const result = await turnkeyClient.createWallet({
    type: 'ACTIVITY_TYPE_CREATE_WALLET',
    organizationId: TURNKEY_ORGANIZATION_ID,
    timestampMs: String(Date.now()),
    parameters: {
      walletName: `agent-${userId}`,
      accounts: [
        {
          curve: 'CURVE_SECP256K1',
          pathFormat: 'PATH_FORMAT_BIP32',
          path: "m/44'/60'/0'/0/0",
          addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
        },
      ],
    },
  });

  const walletResult = result.activity.result?.createWalletResult;
  if (!walletResult) {
    throw new Error('Turnkey wallet creation did not return a result');
  }

  return {
    walletId: walletResult.walletId,
    address: walletResult.addresses[0],
  };
}

/**
 * Get a viem WalletClient that signs via Turnkey for the given wallet address.
 */
export async function getAgentWalletClient(turnkeyAddress: string) {
  const account = await createAccount({
    client: turnkeyClient,
    organizationId: TURNKEY_ORGANIZATION_ID,
    signWith: turnkeyAddress,
  });

  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}
