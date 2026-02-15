/**
 * Script 03: Sponsored approve + swap via thirdweb API
 *
 * Executes approve(BROKER, max) on USDC and swapIn(USDC -> USDm) via Mento Broker.
 * Gas is sponsored by thirdweb (EIP-7702).
 *
 * Run: pnpm tsx scripts/thirdweb-poc/03-sponsored-swap.ts [amountUSDC]
 *   e.g. pnpm tsx scripts/thirdweb-poc/03-sponsored-swap.ts 1
 */
import { readFileSync, existsSync } from 'fs';
import {
  createPublicClient,
  http,
  encodeFunctionData,
  formatUnits,
  parseUnits,
  type Address,
} from 'viem';
import { celo } from 'viem/chains';
import {
  sendTransaction,
  type TransactionInput,
} from './lib/thirdweb-api';
import {
  STATE_FILE,
  CELO_RPC_URL,
  USDC_ADDRESS,
  USDM_ADDRESS,
  BROKER_ADDRESS,
  BIPOOL_MANAGER_ADDRESS,
  MAX_UINT256,
  CELO_CHAIN_ID,
} from './config';

const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const brokerAbi = [
  {
    name: 'getAmountOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'exchangeProvider', type: 'address' },
      { name: 'exchangeId', type: 'bytes32' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapIn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'exchangeProvider', type: 'address' },
      { name: 'exchangeId', type: 'bytes32' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

const biPoolManagerAbi = [
  {
    name: 'getExchanges',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'exchangeId', type: 'bytes32' },
          { name: 'assets', type: 'address[]' },
        ],
      },
    ],
  },
] as const;

const SLIPPAGE_PCT = 0.5;
const DEFAULT_AMOUNT = '1';

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

async function findRoute(
  tokenIn: Address,
  tokenOut: Address,
  publicClient: ReturnType<typeof createPublicClient>,
): Promise<Array<{ exchangeId: `0x${string}`; tokenIn: Address; tokenOut: Address }>> {
  const exchanges = await publicClient.readContract({
    address: BIPOOL_MANAGER_ADDRESS,
    abi: biPoolManagerAbi,
    functionName: 'getExchanges',
  });

  const pairMap = new Map<string, `0x${string}`>();
  for (const { exchangeId, assets } of exchanges) {
    if (assets.length >= 2) {
      const a0 = assets[0].toLowerCase();
      const a1 = assets[1].toLowerCase();
      pairMap.set(`${a0}:${a1}`, exchangeId);
      pairMap.set(`${a1}:${a0}`, exchangeId);
    }
  }

  const direct = pairMap.get(
    `${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}`,
  );
  if (direct) {
    return [{ exchangeId: direct, tokenIn, tokenOut }];
  }

  const toHub = pairMap.get(`${tokenIn.toLowerCase()}:${USDM_ADDRESS.toLowerCase()}`);
  const fromHub = pairMap.get(`${USDM_ADDRESS.toLowerCase()}:${tokenOut.toLowerCase()}`);
  if (toHub && fromHub) {
    return [
      { exchangeId: toHub, tokenIn, tokenOut: USDM_ADDRESS },
      { exchangeId: fromHub, tokenIn: USDM_ADDRESS, tokenOut },
    ];
  }

  throw new Error(`No route found: ${tokenIn} → ${tokenOut}`);
}

function applySlippage(amountOut: bigint, slippagePct: number): bigint {
  const basisPoints = BigInt(Math.floor(slippagePct * 100));
  return (amountOut * (10000n - basisPoints)) / 10000n;
}

async function main() {
  const amountArg = process.argv[2] || DEFAULT_AMOUNT;
  const amountIn = parseUnits(amountArg, 6);

  console.log('\n--- Thirdweb PoC: Sponsored Approve + Swap ---\n');

  const { serverWalletAddress } = loadState();
  console.log(`Server wallet: ${serverWalletAddress}`);
  console.log(`Swap: ${amountArg} USDC → USDm (gas sponsored by thirdweb)\n`);

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  });

  // 1. Find route
  console.log('1. Finding route USDC → USDm...');
  const route = await findRoute(USDC_ADDRESS, USDM_ADDRESS, publicClient);
  console.log(`   Route: ${route.length}-hop`);

  // 2. Get quote
  console.log('\n2. Getting quote...');
  let expectedOut = amountIn;
  for (const hop of route) {
    expectedOut = await publicClient.readContract({
      address: BROKER_ADDRESS,
      abi: brokerAbi,
      functionName: 'getAmountOut',
      args: [
        BIPOOL_MANAGER_ADDRESS,
        hop.exchangeId,
        hop.tokenIn,
        hop.tokenOut,
        expectedOut,
      ],
    });
  }
  const amountOutMin = applySlippage(expectedOut, SLIPPAGE_PCT);
  console.log(`   Expected: ${formatUnits(expectedOut, 18)} USDm`);
  console.log(`   Min out (${SLIPPAGE_PCT}% slippage): ${formatUnits(amountOutMin, 18)} USDm`);

  // 3. Build approve tx
  const approveTx: TransactionInput = {
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [BROKER_ADDRESS, MAX_UINT256],
    }),
    value: '0',
  };

  // 4. Build swap tx (single hop for USDC -> USDm)
  const hop = route[0];
  const hopMinOut = route.length === 1 ? amountOutMin : 1n;
  const swapTx: TransactionInput = {
    to: BROKER_ADDRESS,
    data: encodeFunctionData({
      abi: brokerAbi,
      functionName: 'swapIn',
      args: [
        BIPOOL_MANAGER_ADDRESS,
        hop.exchangeId,
        hop.tokenIn,
        hop.tokenOut,
        amountIn,
        hopMinOut,
      ],
    }),
    value: '0',
  };

  // 5. Send via thirdweb API (sponsored)
  console.log('\n3. Sending approve + swap via thirdweb API (gas sponsored)...');
  const { transactionIds } = await sendTransaction({
    chainId: CELO_CHAIN_ID,
    from: serverWalletAddress,
    transactions: [approveTx, swapTx],
  });

  console.log(`   Transaction IDs: ${transactionIds.join(', ')}`);

  // 6. Verify balances (poll briefly)
  console.log('\n4. Verifying on-chain (waiting 15s for confirmation)...');
  await new Promise((r) => setTimeout(r, 15_000));

  const [usdcAfter, usdmAfter] = await Promise.all([
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [serverWalletAddress as `0x${string}`],
    }),
    publicClient.readContract({
      address: USDM_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [serverWalletAddress as `0x${string}`],
    }),
  ]);

  console.log(`   USDC balance: ${formatUnits(usdcAfter, 6)}`);
  console.log(`   USDm balance: ${formatUnits(usdmAfter, 18)}`);

  if (usdmAfter > 0n) {
    console.log('\n✓ Swap successful! Gas was sponsored by thirdweb.\n');
  } else {
    console.log('\n⚠ Transaction submitted. Check status on Celoscan or thirdweb dashboard.\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
