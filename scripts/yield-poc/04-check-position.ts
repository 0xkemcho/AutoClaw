/**
 * Script 04: Check Ichi vault position
 *
 * Displays current vault share balance and underlying token amounts.
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/04-check-position.ts
 */
import { formatUnits } from 'viem';
import {
  publicClient,
  WALLET_ADDRESS,
  ICHI_VAULT,
  ichiVaultAbi,
  formatToken,
  printBalances,
} from './config';

async function main() {
  console.log('\n=== Ichi Vault Position Check ===\n');

  await printBalances();

  const [shares, totalAmounts, totalSupply] = await Promise.all([
    publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'balanceOf', args: [WALLET_ADDRESS] }),
    publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'getTotalAmounts' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'totalSupply' }),
  ]);

  console.log('Vault state:');
  console.log(`  Total USDT in vault:  ${formatToken(totalAmounts[0], 6)}`);
  console.log(`  Total WETH in vault:  ${formatToken(totalAmounts[1], 18)}`);
  console.log(`  Total LP supply:      ${formatToken(totalSupply, 18)}`);
  console.log('');

  console.log('Your position:');
  console.log(`  LP shares:            ${formatToken(shares, 18)}`);

  if (totalSupply > 0n && shares > 0n) {
    const myUsdt = (shares * totalAmounts[0]) / totalSupply;
    const myWeth = (shares * totalAmounts[1]) / totalSupply;
    const shareOfVault = Number(shares * 10000n / totalSupply) / 100;

    console.log(`  Underlying USDT:      ~${formatToken(myUsdt, 6)}`);
    console.log(`  Underlying WETH:      ~${formatToken(myWeth, 18)}`);
    console.log(`  Share of vault:       ${shareOfVault.toFixed(2)}%`);

    // Estimate USD value (USDT ≈ $1, WETH price fetched from vault ratio)
    const usdtValue = Number(formatUnits(myUsdt, 6));
    const wethValue = Number(formatUnits(myWeth, 18));
    // Rough WETH price estimate from vault composition
    const vaultUsdt = Number(formatUnits(totalAmounts[0], 6));
    const vaultWeth = Number(formatUnits(totalAmounts[1], 18));
    const estimatedWethPrice = vaultWeth > 0 ? vaultUsdt / vaultWeth : 0;
    const totalUsdValue = usdtValue + wethValue * estimatedWethPrice;

    console.log(`  Est. WETH price:      ~$${estimatedWethPrice.toFixed(0)}`);
    console.log(`  Est. total value:     ~$${totalUsdValue.toFixed(2)}`);
  } else {
    console.log('  No position found.');
  }
}

main().catch(console.error);
