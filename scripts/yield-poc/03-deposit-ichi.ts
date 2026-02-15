/**
 * Script 03: Deposit USDT into Ichi USDT-WETH Vault
 *
 * This vault accepts single-sided USDT deposits (token0 = USDT, allowToken0 = true).
 * The vault automatically manages concentrated liquidity on Uniswap V3.
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/03-deposit-ichi.ts [amountUSDT]
 *   e.g. pnpm tsx ../../scripts/yield-poc/03-deposit-ichi.ts 4.5
 */
import { encodeFunctionData, formatUnits, parseUnits } from 'viem';
import {
  publicClient,
  walletClient,
  WALLET_ADDRESS,
  USDT,
  ICHI_VAULT,
  USDC_FEE_ADAPTER,
  erc20Abi,
  ichiVaultAbi,
  formatToken,
  printBalances,
  getBalance,
} from './config';

async function main() {
  console.log('\n=== Ichi Vault Deposit (USDT → USDT-WETH Vault) ===\n');

  // Check current balances
  await printBalances();

  // Read vault info
  const [token0, token1, allowToken0, allowToken1, totalAmounts, totalSupply, deposit0Max] =
    await Promise.all([
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'token0' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'token1' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'allowToken0' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'allowToken1' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'getTotalAmounts' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'totalSupply' }),
      publicClient.readContract({ address: ICHI_VAULT, abi: ichiVaultAbi, functionName: 'deposit0Max' }),
    ]);

  console.log('Vault info:');
  console.log(`  token0 (USDT): ${token0} — allowDeposit: ${allowToken0}`);
  console.log(`  token1 (WETH): ${token1} — allowDeposit: ${allowToken1}`);
  console.log(`  Total USDT:    ${formatToken(totalAmounts[0], 6)}`);
  console.log(`  Total WETH:    ${formatToken(totalAmounts[1], 18)}`);
  console.log(`  Total supply:  ${formatToken(totalSupply, 18)} LP shares`);
  console.log(`  deposit0Max:   ${formatToken(deposit0Max, 6)} USDT`);

  // Determine deposit amount
  const usdtBalance = await getBalance(USDT, WALLET_ADDRESS);
  const amountArg = process.argv[2];
  const depositAmount = amountArg ? parseUnits(amountArg, 6) : usdtBalance;

  if (depositAmount === 0n) {
    console.log('\nNo USDT to deposit. Run 02-swap-usdc-to-usdt.ts first.');
    return;
  }

  if (depositAmount > usdtBalance) {
    console.log(`\nInsufficient USDT. Have ${formatToken(usdtBalance, 6)}, want ${formatToken(depositAmount, 6)}`);
    return;
  }

  console.log(`\nDepositing ${formatToken(depositAmount, 6)} USDT into Ichi vault...`);

  // 1. Approve USDT to vault
  console.log('\n1. Checking USDT approval to vault...');
  const allowance = await publicClient.readContract({
    address: USDT,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [WALLET_ADDRESS, ICHI_VAULT],
  });

  if (allowance < depositAmount) {
    console.log('   Approving...');
    const approveTx = await walletClient.sendTransaction({
      to: USDT,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [ICHI_VAULT, 2n ** 256n - 1n],
      }),
      // gas paid in native CELO
    });
    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log(`   Approved: ${approveTx} (status: ${approveReceipt.status})`);
  } else {
    console.log(`   Already approved (${formatToken(allowance, 6)})`);
  }

  // 2. Deposit — single-sided into token0 (USDT)
  console.log('\n2. Depositing into vault...');
  console.log(`   deposit(${depositAmount}, 0, ${WALLET_ADDRESS})`);

  const depositData = encodeFunctionData({
    abi: ichiVaultAbi,
    functionName: 'deposit',
    args: [depositAmount, 0n, WALLET_ADDRESS],
  });

  const depositTx = await walletClient.sendTransaction({
    to: ICHI_VAULT,
    data: depositData,
    // gas paid in native CELO
  });

  const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
  console.log(`   Tx: ${depositTx}`);
  console.log(`   Status: ${depositReceipt.status}`);
  console.log(`   Gas used: ${depositReceipt.gasUsed}`);

  // 3. Check vault shares received
  const sharesAfter = await publicClient.readContract({
    address: ICHI_VAULT,
    abi: ichiVaultAbi,
    functionName: 'balanceOf',
    args: [WALLET_ADDRESS],
  });
  console.log(`\n3. Vault LP shares received: ${formatToken(sharesAfter, 18)}`);

  // Estimate value
  const [newTotal0, newTotal1] = await publicClient.readContract({
    address: ICHI_VAULT,
    abi: ichiVaultAbi,
    functionName: 'getTotalAmounts',
  });
  const newTotalSupply = await publicClient.readContract({
    address: ICHI_VAULT,
    abi: ichiVaultAbi,
    functionName: 'totalSupply',
  });

  if (newTotalSupply > 0n) {
    const myUsdt = (sharesAfter * newTotal0) / newTotalSupply;
    const myWeth = (sharesAfter * newTotal1) / newTotalSupply;
    console.log(`   Underlying USDT: ~${formatToken(myUsdt, 6)}`);
    console.log(`   Underlying WETH: ~${formatToken(myWeth, 18)}`);
  }

  // 4. Final balances
  console.log('\n4. Final balances:');
  await printBalances();

  console.log('Deposit complete! Merkl rewards will start accruing in ~8 hours.');
}

main().catch(console.error);
