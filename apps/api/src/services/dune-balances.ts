const DUNE_API_BASE = 'https://api.sim.dune.com/v1/evm/balances';
const CELO_CHAIN_ID = '42220';

export interface DuneBalance {
  chain_id: number;
  address: string;
  amount: string;
  symbol: string;
  name: string;
  decimals: number;
  price_usd: number;
  value_usd: number;
}

/**
 * Fetch all ERC20 token balances for a wallet on Celo via Dune SIM API.
 * Returns only tokens with a non-zero balance.
 */
export async function getWalletBalances(walletAddress: string): Promise<DuneBalance[]> {
  const apiKey = process.env.DUNE_SIM_API_KEY;
  if (!apiKey) {
    throw new Error('DUNE_SIM_API_KEY is not configured');
  }

  const url = new URL(`${DUNE_API_BASE}/${walletAddress}`);
  url.searchParams.set('chain_ids', CELO_CHAIN_ID);
  url.searchParams.set('filters', 'erc20');
  url.searchParams.set('exclude_spam_tokens', 'true');

  const res: any = await fetch(url.toString(), {
    headers: { 'X-Sim-Api-Key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`Dune SIM API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { balances: DuneBalance[] };
  return (data.balances ?? []).filter((b) => Number(b.amount) > 0);
}
