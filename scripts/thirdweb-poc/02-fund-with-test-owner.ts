/**
 * Fund server wallet with 1 USDC using TEST_OWNER_KEY from .env
 * Also prints the address (public key) for TEST_OWNER_KEY.
 *
 * Run: cd apps/api && pnpm tsx ../../scripts/thirdweb-poc/02-fund-with-test-owner.ts
 */
import { readFileSync, existsSync } from 'fs';
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseUnits,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { STATE_FILE, CELO_RPC_URL, USDC_ADDRESS } from './config';

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

const AMOUNT_USDC = parseUnits('1', 6);

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

async function main() {
  const pk = process.env.TEST_OWNER_KEY;
  if (!pk) {
    throw new Error('TEST_OWNER_KEY is not set in .env');
  }

  const key = pk.startsWith('0x') ? pk : `0x${pk}`;
  const account = privateKeyToAccount(key as `0x${string}`);

  console.log('\n--- Fund Server Wallet with TEST_OWNER_KEY ---\n');
  console.log('TEST_OWNER_KEY address (public key):', account.address);
  console.log('');

  const { serverWalletAddress } = loadState();
  console.log('Server wallet (recipient):', serverWalletAddress);
  console.log('Amount: 1 USDC\n');

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  });

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`TEST_OWNER balance: ${formatUnits(balance, 6)} USDC`);

  if (balance < AMOUNT_USDC) {
    throw new Error(
      `Insufficient USDC: need 1 USDC, have ${formatUnits(balance, 6)}`,
    );
  }

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(CELO_RPC_URL),
  });

  console.log('\nSending 1 USDC...');
  const hash = await walletClient.sendTransaction({
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [serverWalletAddress as `0x${string}`, AMOUNT_USDC],
    }),
  });

  console.log(`Tx submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`Transfer failed: tx ${hash}`);
  }
  console.log('Transfer confirmed.\n');

  const serverBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [serverWalletAddress as `0x${string}`],
  });
  console.log(`Server wallet USDC balance: ${formatUnits(serverBalance, 6)}`);
  console.log('\nDone. Next: run 03-sponsored-swap.ts\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
