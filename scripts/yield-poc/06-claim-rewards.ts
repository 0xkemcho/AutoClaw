/**
 * Script 06: Claim Merkl rewards
 *
 * Claims accumulated rewards from the Merkl Distributor contract on Celo.
 * Requires rewards to have been earned (check with 05-check-rewards.ts first).
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/06-claim-rewards.ts
 */
import { encodeFunctionData } from 'viem';
import {
  publicClient,
  walletClient,
  WALLET_ADDRESS,
  MERKL_DISTRIBUTOR,
  MERKL_API_BASE,
  merklDistributorAbi,
  printBalances,
} from './config';

async function main() {
  console.log('\n=== Merkl Reward Claim ===\n');
  console.log(`Wallet: ${WALLET_ADDRESS}\n`);

  // 1. Fetch rewards with proofs
  console.log('1. Fetching rewards from Merkl API...');
  const url = `${MERKL_API_BASE}/users/${WALLET_ADDRESS}/rewards?chainId=42220`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Merkl API error: ${res.status}`);

  const data = await res.json();
  const rewards = Array.isArray(data) ? data : [];

  // Filter for claimable rewards (has proofs and amount > claimed)
  const claimable = rewards.filter((r: any) => {
    const total = BigInt(r.amount || '0');
    const claimed = BigInt(r.claimed || '0');
    return total > claimed && r.proofs?.length > 0;
  });

  if (claimable.length === 0) {
    console.log('No claimable rewards found.');
    console.log('Either no rewards have accrued yet, or all rewards have been claimed.');
    console.log('Note: Rewards take ~8 hours to appear after providing liquidity.');
    return;
  }

  console.log(`Found ${claimable.length} claimable reward(s):\n`);

  // 2. Build claim arrays
  const users: `0x${string}`[] = [];
  const tokens: `0x${string}`[] = [];
  const amounts: bigint[] = [];
  const proofs: `0x${string}`[][] = [];

  for (const reward of claimable) {
    const total = BigInt(reward.amount);
    const claimed = BigInt(reward.claimed);
    const toClaim = total - claimed;
    const decimals = reward.token.decimals;

    const fmt = (v: bigint) => {
      const str = v.toString().padStart(decimals + 1, '0');
      return `${str.slice(0, str.length - decimals) || '0'}.${str.slice(str.length - decimals, str.length - decimals + 6)}`;
    };

    console.log(`  ${reward.token.symbol}: ${fmt(toClaim)} claimable`);

    users.push(WALLET_ADDRESS);
    tokens.push(reward.token.address as `0x${string}`);
    amounts.push(total); // IMPORTANT: pass cumulative total, not incremental
    proofs.push(reward.proofs as `0x${string}`[]);
  }

  // 3. Pre-claim balances
  console.log('\nPre-claim balances:');
  await printBalances();

  // 4. Execute claim
  console.log('3. Claiming rewards...');
  const claimData = encodeFunctionData({
    abi: merklDistributorAbi,
    functionName: 'claim',
    args: [users, tokens, amounts, proofs],
  });

  const tx = await walletClient.sendTransaction({
    to: MERKL_DISTRIBUTOR,
    data: claimData,
    // gas paid in native CELO
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`   Tx: ${tx}`);
  console.log(`   Status: ${receipt.status}`);

  // 5. Post-claim balances
  console.log('\nPost-claim balances:');
  await printBalances();

  console.log('Rewards claimed successfully!');
}

main().catch(console.error);
