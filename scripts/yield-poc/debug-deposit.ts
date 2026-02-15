/**
 * Debug: Simulate Ichi vault deposit to get exact revert reason
 */
import { createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';
import {
  publicClient,
  WALLET_ADDRESS,
  USDT,
  ICHI_VAULT,
  erc20Abi,
  ichiVaultAbi,
  formatToken,
} from './config';

const extendedVaultAbi = [
  ...ichiVaultAbi,
  { name: 'maxTotalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'hysteresis', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'currentTick', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'int24' }] },
  { name: 'pool', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'affiliate', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

async function main() {
  console.log('=== Debug Ichi Vault Deposit ===\n');

  const [maxTotalSupply, hysteresis, deposit0Max, deposit1Max, totalSupply, allowToken0, allowToken1, totalAmounts, usdtBalance, usdtAllowance] = await Promise.all([
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'maxTotalSupply' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'hysteresis' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'deposit0Max' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'deposit1Max' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'totalSupply' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'allowToken0' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'allowToken1' }),
    publicClient.readContract({ address: ICHI_VAULT, abi: extendedVaultAbi, functionName: 'getTotalAmounts' }),
    publicClient.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [WALLET_ADDRESS] }),
    publicClient.readContract({ address: USDT, abi: erc20Abi, functionName: 'allowance', args: [WALLET_ADDRESS, ICHI_VAULT] }),
  ]);

  console.log('Vault State:');
  console.log(`  maxTotalSupply: ${maxTotalSupply} (${formatToken(maxTotalSupply as bigint, 18)})`);
  console.log(`  hysteresis:     ${hysteresis}`);
  console.log(`  deposit0Max:    ${deposit0Max} (${formatToken(deposit0Max as bigint, 6)} USDT)`);
  console.log(`  deposit1Max:    ${deposit1Max} (${formatToken(deposit1Max as bigint, 18)} WETH)`);
  console.log(`  totalSupply:    ${totalSupply} (${formatToken(totalSupply as bigint, 18)} shares)`);
  console.log(`  allowToken0:    ${allowToken0}`);
  console.log(`  allowToken1:    ${allowToken1}`);
  console.log(`  totalAmounts:   [${totalAmounts[0]}, ${totalAmounts[1]}]`);
  console.log(`  total USDT:     ${formatToken(totalAmounts[0], 6)}`);
  console.log(`  total WETH:     ${formatToken(totalAmounts[1], 18)}`);
  console.log(`\nWallet State:`);
  console.log(`  USDT balance:   ${usdtBalance} (${formatToken(usdtBalance, 6)})`);
  console.log(`  USDT allowance: ${usdtAllowance} (${formatToken(usdtAllowance as bigint, 6)})`);

  // Check require conditions
  const depositAmount = usdtBalance; // Try full balance
  console.log(`\n--- Checking deposit(${depositAmount}, 0, ${WALLET_ADDRESS}) ---`);
  console.log(`  allowToken0 || deposit0==0: ${allowToken0} || false = ${allowToken0 || false} → ${(allowToken0 || false) ? 'PASS' : 'FAIL'}`);
  console.log(`  allowToken1 || deposit1==0: ${allowToken1} || true = ${allowToken1 || true} → ${(allowToken1 || true) ? 'PASS' : 'FAIL'}`);
  console.log(`  deposit0 > 0 || deposit1 > 0: ${depositAmount > 0n} || false = ${depositAmount > 0n} → ${(depositAmount > 0n) ? 'PASS' : 'FAIL'}`);
  console.log(`  deposit0 < deposit0Max: ${depositAmount} < ${deposit0Max} = ${depositAmount < (deposit0Max as bigint)} → ${(depositAmount < (deposit0Max as bigint)) ? 'PASS' : 'FAIL'}`);
  console.log(`  deposit1 < deposit1Max: 0 < ${deposit1Max} = ${0n < (deposit1Max as bigint)} → ${(0n < (deposit1Max as bigint)) ? 'PASS' : 'FAIL'}`);

  // Simulate the call
  console.log('\n--- Simulating deposit via eth_call ---');
  try {
    const result = await publicClient.simulateContract({
      address: ICHI_VAULT,
      abi: ichiVaultAbi,
      functionName: 'deposit',
      args: [depositAmount, 0n, WALLET_ADDRESS],
      account: WALLET_ADDRESS,
    });
    console.log(`  Simulation SUCCESS! Shares: ${result.result}`);
  } catch (e: any) {
    console.log(`  Simulation FAILED!`);
    console.log(`  Short message: ${e.shortMessage}`);
    if (e.cause) {
      console.log(`  Cause: ${e.cause.message?.slice(0, 1000)}`);
      if (e.cause.data) console.log(`  Data: ${e.cause.data}`);
    }
    if (e.details) console.log(`  Details: ${e.details}`);
    // Try with a small amount too
    console.log('\n--- Retrying with small amount (1 USDT = 1000000) ---');
    try {
      const result2 = await publicClient.simulateContract({
        address: ICHI_VAULT,
        abi: ichiVaultAbi,
        functionName: 'deposit',
        args: [1000000n, 0n, WALLET_ADDRESS],
        account: WALLET_ADDRESS,
      });
      console.log(`  Simulation SUCCESS with 1 USDT! Shares: ${result2.result}`);
    } catch (e2: any) {
      console.log(`  Still FAILED with 1 USDT: ${e2.shortMessage}`);
      if (e2.cause) console.log(`  Cause: ${e2.cause.message?.slice(0, 500)}`);
    }
  }
}

main().catch(console.error);
