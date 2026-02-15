import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

// @ts-ignore - Multiple viem installations cause type conflicts in build
export const celoClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
});
