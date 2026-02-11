import { type Address, erc20Abi } from 'viem';
import { celoClient } from '../lib/celo-client';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { MENTO_TOKEN_ADDRESSES, USDC_CELO_ADDRESS, USDT_CELO_ADDRESS } from '@autoclaw/shared';
import { logTimeline } from './agent-cron';

type AgentConfigRow = Database['public']['Tables']['agent_configs']['Row'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Tokens we monitor for incoming deposits. */
const MONITORED_TOKENS: Array<{ symbol: string; address: Address; decimals: number }> = [
  { symbol: 'USDm', address: MENTO_TOKEN_ADDRESSES.USDm as Address, decimals: 18 },
  { symbol: 'USDC', address: USDC_CELO_ADDRESS as Address, decimals: 6 },
  { symbol: 'USDT', address: USDT_CELO_ADDRESS as Address, decimals: 6 },
];

/** In-memory cache of last known balances per wallet per token. */
const lastKnownBalances = new Map<string, bigint>();

function balanceKey(wallet: string, symbol: string): string {
  return `${wallet.toLowerCase()}:${symbol}`;
}

/**
 * Check all active agent wallets for new deposits.
 * Call this from the agent cron tick.
 */
export async function checkForDeposits(): Promise<void> {
  const { data: configs, error } = await supabaseAdmin
    .from('agent_configs')
    .select('wallet_address, server_wallet_address')
    .not('server_wallet_address', 'is', null);

  if (error || !configs) return;

  for (const rawConfig of configs) {
    const config = rawConfig as Pick<AgentConfigRow, 'wallet_address' | 'server_wallet_address'>;
    const serverAddress = config.server_wallet_address as Address;
    if (!serverAddress) continue;

    for (const token of MONITORED_TOKENS) {
      try {
        const balance = await celoClient.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [serverAddress],
        });

        const key = balanceKey(serverAddress, token.symbol);
        const previous = lastKnownBalances.get(key);

        // Update cache
        lastKnownBalances.set(key, balance);

        // If this is the first check (no previous balance), skip to avoid false positives
        if (previous === undefined) continue;

        // Detect new deposit
        if (balance > previous) {
          const depositAmount = balance - previous;
          const depositFormatted = Number(depositAmount) / 10 ** token.decimals;

          await logTimeline(config.wallet_address, 'funding', {
            summary: `Received ${depositFormatted.toFixed(2)} ${token.symbol}`,
            detail: {
              token: token.symbol,
              amount: depositFormatted,
              rawAmount: depositAmount.toString(),
            },
          });

          // TODO (Part 2): Auto-convert USDC/USDT to USDm via Mento Broker
        }
      } catch (err) {
        // Silently skip individual token balance checks
        console.error(`Failed to check ${token.symbol} balance for ${serverAddress}:`, err);
      }
    }
  }
}
