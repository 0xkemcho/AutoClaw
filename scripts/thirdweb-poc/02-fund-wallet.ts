/**
 * Script 02: Fund server wallet with USDC
 *
 * Option A: If FUNDER_PRIVATE_KEY is set, automatically sends 5 USDC to the server wallet.
 * Option B: Prints instructions for manual funding and polls until balance >= 5 USDC.
 *
 * Run: pnpm tsx scripts/thirdweb-poc/02-fund-wallet.ts
 */
import { readFileSync, existsSync } from 'fs';
import { createPublicClient, createWalletClient, http, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import {
  STATE_FILE,
  CELO_RPC_URL,
  USDC_ADDRESS,
  CELO_CHAIN_ID,
} from './config';

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const TARGET_USDC = parseUnits('5', 6);
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

function loadState(): { serverWalletAddress: string } {
  if (!existsSync(STATE_FILE)) {
    throw new Error(
      `State file not found: ${STATE_FILE}. Run 01-create-wallet.ts first.`,
    );
  }
  const raw = readFileSync(STATE_FILE, 'utf-8');
  const state = JSON.parse(raw) as { serverWalletAddress?: string };
  if (!state.serverWalletAddress) {
    throw new Error(`Invalid state: missing serverWalletAddress`);
  }
  return state;
}

async function getUsdcBalance(address: string): Promise<bigint> {
  const client = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  });
  return client.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
}

async function autoFund(serverAddress: string): Promise<void> {
  const pk = process.env.FUNDER_PRIVATE_KEY;
  if (!pk) return;

  const key = pk.startsWith('0x') ? pk : `0x${pk}`;
  const account = privateKeyToAccount(key as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(CELO_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  });

  console.log(`  Sending 5 USDC from ${account.address} to ${serverAddress}...`);

  const hash = await walletClient.sendTransaction({
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [serverAddress as `0x${string}`, TARGET_USDC],
    }),
  });

  console.log(`  Tx submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`Transfer failed: tx ${hash}`);
  }
  console.log(`  Transfer confirmed.\n`);
}

async function pollUntilFunded(serverAddress: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const balance = await getUsdcBalance(serverAddress);
    if (balance >= TARGET_USDC) {
      console.log(`  Balance: ${formatUnits(balance, 6)} USDC (sufficient)\n`);
      return;
    }
    console.log(`  Balance: ${formatUnits(balance, 6)} USDC — waiting...`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Timeout: server wallet still has < 5 USDC after ${POLL_TIMEOUT_MS / 1000}s`);
}

async function main() {
  console.log('\n--- Thirdweb PoC: Fund Server Wallet ---\n');

  const { serverWalletAddress } = loadState();
  console.log(`Server wallet: ${serverWalletAddress}`);

  if (process.env.FUNDER_PRIVATE_KEY) {
    await autoFund(serverWalletAddress);
  } else {
    console.log(`\nSend 5+ USDC to this address on Celo (chain ID ${CELO_CHAIN_ID}):`);
    console.log(`  ${serverWalletAddress}`);
    console.log(`\nOr set FUNDER_PRIVATE_KEY in .env for auto-funding.`);
    console.log(`\nPolling for balance...`);
  }

  await pollUntilFunded(serverWalletAddress);
  console.log('Server wallet funded. Next: run 03-sponsored-swap.ts\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
