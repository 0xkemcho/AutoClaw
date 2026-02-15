/**
 * Script 01: Query Merkl API for Ichi vault opportunities on Celo
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/01-query-merkl.ts
 */
import { MERKL_API_BASE } from './config';

interface MerklOpportunity {
  id: string;
  name: string;
  status: string;
  apr: number;
  tvl: number;
  dailyRewards: number;
  identifier: string;
  tokens: Array<{ symbol: string; address: string; decimals: number }>;
  protocol: { id: string; name: string };
  depositUrl?: string;
}

async function main() {
  console.log('Fetching Merkl opportunities on Celo (chainId=42220)...\n');

  const res = await fetch(`${MERKL_API_BASE}/opportunities?chainId=42220`);
  if (!res.ok) throw new Error(`Merkl API error: ${res.status} ${res.statusText}`);

  const opportunities: MerklOpportunity[] = await res.json();

  // Filter for Ichi vaults
  const ichiVaults = opportunities.filter(
    (o) => o.protocol?.name?.toLowerCase().includes('ichi') && o.status === 'LIVE',
  );

  console.log(`Found ${opportunities.length} total opportunities, ${ichiVaults.length} live Ichi vaults:\n`);

  // Sort by APR descending
  ichiVaults.sort((a, b) => b.apr - a.apr);

  for (const v of ichiVaults) {
    const tokenPair = v.tokens.map((t) => t.symbol).join(' / ');
    console.log(`  ${v.name}`);
    console.log(`    Vault:   ${v.identifier}`);
    console.log(`    Tokens:  ${tokenPair}`);
    console.log(`    APR:     ${v.apr.toFixed(2)}%`);
    console.log(`    TVL:     $${v.tvl.toLocaleString()}`);
    console.log(`    Rewards: $${v.dailyRewards.toFixed(2)}/day`);
    console.log('');
  }

  // Also show top non-Ichi opportunities for context
  const nonIchi = opportunities
    .filter((o) => !o.protocol?.name?.toLowerCase().includes('ichi') && o.status === 'LIVE')
    .sort((a, b) => b.apr - a.apr)
    .slice(0, 5);

  console.log('--- Top 5 non-Ichi opportunities ---\n');
  for (const o of nonIchi) {
    console.log(`  ${o.name} (${o.protocol?.name})`);
    console.log(`    APR: ${o.apr.toFixed(2)}%, TVL: $${o.tvl.toLocaleString()}, Rewards: $${o.dailyRewards.toFixed(2)}/day`);
    console.log('');
  }
}

main().catch(console.error);
