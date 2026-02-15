/**
 * Script 05: Check Merkl rewards for the test wallet
 *
 * Queries the Merkl API for accumulated rewards on Celo.
 * Rewards start appearing ~8 hours after providing liquidity.
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/05-check-rewards.ts
 */
import { WALLET_ADDRESS, MERKL_API_BASE } from './config';

interface RewardBreakdown {
  campaignId: string;
  reason: { protocol: string; tokenAddress: string };
  amount: string;
  pending: string;
}

interface MerklReward {
  token: { address: string; symbol: string; decimals: number };
  amount: string;       // cumulative total earned (raw units)
  claimed: string;      // already claimed (raw units)
  pending: string;      // unrealized, updates every ~2h
  proofs: string[];     // merkle proofs for claiming
  breakdowns: RewardBreakdown[];
}

async function main() {
  console.log('\n=== Merkl Rewards Check ===\n');
  console.log(`Wallet: ${WALLET_ADDRESS}\n`);

  const url = `${MERKL_API_BASE}/users/${WALLET_ADDRESS}/rewards?chainId=42220`;
  console.log(`Fetching: ${url}\n`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Merkl API error: ${res.status} ${res.statusText}`);

  const data = await res.json();

  // The response structure may vary -- handle both array and object formats
  const rewards: MerklReward[] = Array.isArray(data) ? data : [];

  if (rewards.length === 0) {
    console.log('No rewards found yet.');
    console.log('');
    console.log('Note: Merkl rewards take ~8 hours to appear after providing liquidity.');
    console.log('The Merkl engine computes rewards every ~2 hours and publishes Merkle roots every ~8 hours.');
    console.log('');
    console.log('Check back later!');

    // Also show raw response for debugging
    console.log('\nRaw API response:');
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    return;
  }

  console.log(`Found ${rewards.length} reward token(s):\n`);

  for (const reward of rewards) {
    const decimals = reward.token.decimals;
    const total = BigInt(reward.amount);
    const claimed = BigInt(reward.claimed);
    const claimable = total - claimed;
    const pending = BigInt(reward.pending);

    const fmt = (v: bigint) => {
      const str = v.toString().padStart(decimals + 1, '0');
      const intPart = str.slice(0, str.length - decimals) || '0';
      const fracPart = str.slice(str.length - decimals, str.length - decimals + 6);
      return `${intPart}.${fracPart}`;
    };

    console.log(`  ${reward.token.symbol} (${reward.token.address})`);
    console.log(`    Total earned:  ${fmt(total)}`);
    console.log(`    Claimed:       ${fmt(claimed)}`);
    console.log(`    Claimable:     ${fmt(claimable)}`);
    console.log(`    Pending:       ${fmt(pending)} (not yet in Merkle tree)`);
    console.log(`    Has proofs:    ${reward.proofs.length > 0 ? 'YES' : 'NO'}`);
    console.log('');

    if (reward.breakdowns?.length) {
      console.log('    Breakdowns:');
      for (const bd of reward.breakdowns) {
        console.log(`      Campaign: ${bd.campaignId.slice(0, 16)}...`);
        console.log(`      Amount: ${bd.amount}`);
        console.log('');
      }
    }
  }
}

main().catch(console.error);
