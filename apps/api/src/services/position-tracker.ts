import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { getTokenAddress } from '@autoclaw/shared';

type PositionRow = Database['public']['Tables']['agent_positions']['Row'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Get current positions for a wallet from the DB.
 */
export async function getPositions(walletAddress: string): Promise<PositionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('agent_positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .gt('balance', 0);

  if (error) {
    console.error('Failed to fetch positions:', error);
    return [];
  }

  return (data ?? []) as PositionRow[];
}

/**
 * Calculate the total portfolio value in USD.
 */
export async function calculatePortfolioValue(
  positions: PositionRow[],
): Promise<number> {
  let total = 0;
  for (const pos of positions) {
    const { data: snapshot } = await supabaseAdmin
      .from('token_price_snapshots')
      .select('price_usd')
      .eq('token_symbol', pos.token_symbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const priceUsd = (snapshot as { price_usd: number } | null)?.price_usd ?? 1;
    total += pos.balance * priceUsd;
  }
  return total;
}

/**
 * Update positions after a trade.
 */
export async function updatePositionAfterTrade(params: {
  walletAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
  rate: number;
}): Promise<void> {
  const { walletAddress, currency, direction, amountUsd, rate } = params;
  const tokenAddress = getTokenAddress(currency) || '';

  const { data: existing } = await supabaseAdmin
    .from('agent_positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('token_symbol', currency)
    .maybeSingle();

  const existingPos = existing as PositionRow | null;
  const currentBalance = existingPos?.balance ?? 0;
  const currentAvgRate = existingPos?.avg_entry_rate ?? 0;

  let newBalance: number;
  let newAvgRate: number;

  if (direction === 'buy') {
    const tokensAcquired = amountUsd * rate;
    newBalance = currentBalance + tokensAcquired;
    if (newBalance > 0) {
      newAvgRate = ((currentBalance * currentAvgRate) + (tokensAcquired * (1 / rate))) / newBalance;
    } else {
      newAvgRate = 1 / rate;
    }
  } else {
    const tokensReduced = amountUsd * rate;
    newBalance = Math.max(0, currentBalance - tokensReduced);
    newAvgRate = currentAvgRate;
  }

  await supabaseAdmin
    .from('agent_positions')
    .upsert({
      wallet_address: walletAddress,
      token_symbol: currency,
      token_address: tokenAddress,
      balance: newBalance,
      avg_entry_rate: newAvgRate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address,token_symbol' });
}
