import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

// Explicit any type to avoid TS7056: type inference exceeding max length
export const celoClient: any = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
});
