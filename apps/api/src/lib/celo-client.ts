import { createPublicClient, http, type PublicClient } from 'viem';
import { celo } from 'viem/chains';

export const celoClient: PublicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
});
