import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

export const celoClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
}) as ReturnType<typeof createPublicClient>;
