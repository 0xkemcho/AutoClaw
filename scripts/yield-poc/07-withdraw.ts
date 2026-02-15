/**
 * Script 07: Withdraw from Ichi vault
 *
 * Burns LP shares and receives underlying tokens (USDT + WETH).
 * Note: You will receive a mix of both tokens proportional to the vault's holdings.
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/07-withdraw.ts [shares|all]
 *   e.g. pnpm tsx ../../scripts/yield-poc/07-withdraw.ts all
 *   e.g. pnpm tsx ../../scripts/yield-poc/07-withdraw.ts 0.5
 */
import { encodeFunctionData, formatUnits, parseUnits } from 'viem';
import {
  publicClient,
  walletClient,
  WALLET_ADDRESS,
  ICHI_VAULT,
  ichiVaultAbi,
  formatToken,
  printBalances,
} from './config';

async function main() {
  console.log('\n=== Ichi Vault Withdrawal ===\n');

  // Check current position
  const shares = await publicClient.readContract({
    address: ICHI_VAULT,
    abi: ichiVaultAbi,
    functionName: 'balanceOf',
    args: [WALLET_ADDRESS],
  });

  if (shares === 0n) {
    console.log('No vault shares to withdraw.');
    return;
  }

  console.log(`Current LP shares: ${formatToken(shares, 18)}`);

  // Determine withdrawal amount
  const arg = process.argv[2] || 'all';
  const withdrawShares = arg === 'all' ? shares : parseUnits(arg, 18);

  if (withdrawShares > shares) {
    console.log(`Cannot withdraw ${formatToken(withdrawShares, 18)} — only have ${formatToken(shares, 18)}`);
    return;
  }

  // Estimate output
  const [totalAmounts, totalSupply] = await Promise.all([
    publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'getTotalAmounts' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'totalSupply' }),
  ]);

  const expectedUsdt = (withdrawShares * totalAmounts[0]) / totalSupply;
  const expectedWeth = (withdrawShares * totalAmounts[1]) / totalSupply;

  console.log(`\nWithdrawing ${arg === 'all' ? 'ALL' : formatToken(withdrawShares, 18)} shares`);
  console.log(`  Expected USDT: ~${formatToken(expectedUsdt, 6)}`);
  console.log(`  Expected WETH: ~${formatToken(expectedWeth, 18)}`);

  // Pre-withdrawal balances
  console.log('\nPre-withdrawal balances:');
  await printBalances();

  // Execute withdrawal
  console.log('Withdrawing...');
  const data = encodeFunctionData({
    abi: ichiVaultAbi,
    functionName: 'withdraw',
    args: [withdrawShares, WALLET_ADDRESS],
  });

  const tx = await walletClient.sendTransaction({
    to: ICHI_VAULT,
    data,
    // gas paid in native CELO
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`  Tx: ${tx}`);
  console.log(`  Status: ${receipt.status}`);
  console.log(`  Gas used: ${receipt.gasUsed}`);

  // Post-withdrawal balances
  console.log('\nPost-withdrawal balances:');
  await printBalances();

  console.log('Withdrawal complete!');
}

main().catch(console.error);
