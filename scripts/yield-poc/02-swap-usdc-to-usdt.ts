/**
 * Script 02: Swap USDC → USDT via Mento Broker
 *
 * USDC and USDT are both 6-decimal stablecoins. They route through USDm (18-dec) hub.
 * USDC → USDm → USDT (2-hop swap via Mento Broker)
 *
 * Usage: cd apps/api && pnpm tsx ../../scripts/yield-poc/02-swap-usdc-to-usdt.ts [amountUSDC]
 *   e.g. pnpm tsx ../../scripts/yield-poc/02-swap-usdc-to-usdt.ts 5
 */
import { encodeFunctionData, formatUnits, parseUnits, type Address } from 'viem';
import {
  publicClient,
  walletClient,
  WALLET_ADDRESS,
  USDC,
  USDT,
  USDM,
  BROKER,
  BIPOOL_MANAGER,
  USDC_FEE_ADAPTER,
  erc20Abi,
  formatToken,
  printBalances,
} from './config';

// Broker ABI (just the functions we need)
const brokerAbi = [
  { name: 'getAmountOut', type: 'function', stateMutability: 'view', inputs: [{ name: 'exchangeProvider', type: 'address' }, { name: 'exchangeId', type: 'bytes32' }, { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },
  { name: 'swapIn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'exchangeProvider', type: 'address' }, { name: 'exchangeId', type: 'bytes32' }, { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },
] as const;

const biPoolManagerAbi = [
  { name: 'getExchanges', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'exchangeId', type: 'bytes32' }, { name: 'assets', type: 'address[]' }] }] },
] as const;

async function findRoute(tokenIn: Address, tokenOut: Address) {
  const exchanges = await publicClient.readContract({
    address: BIPOOL_MANAGER,
    abi: biPoolManagerAbi,
    functionName: 'getExchanges',
  });

  const pairMap = new Map<string, `0x${string}`>();
  for (const { exchangeId, assets } of exchanges) {
    if (assets.length >= 2) {
      pairMap.set(`${assets[0].toLowerCase()}:${assets[1].toLowerCase()}`, exchangeId);
      pairMap.set(`${assets[1].toLowerCase()}:${assets[0].toLowerCase()}`, exchangeId);
    }
  }

  // Try direct
  const direct = pairMap.get(`${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}`);
  if (direct) return [{ exchangeId: direct, tokenIn, tokenOut }];

  // Try 2-hop via USDm
  const toHub = pairMap.get(`${tokenIn.toLowerCase()}:${USDM.toLowerCase()}`);
  const fromHub = pairMap.get(`${USDM.toLowerCase()}:${tokenOut.toLowerCase()}`);
  if (toHub && fromHub) {
    return [
      { exchangeId: toHub, tokenIn, tokenOut: USDM },
      { exchangeId: fromHub, tokenIn: USDM, tokenOut },
    ];
  }

  throw new Error(`No route found: ${tokenIn} → ${tokenOut}`);
}

async function approve(token: Address, spender: Address, amount: bigint) {
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [WALLET_ADDRESS, spender],
  });

  if (allowance >= amount) {
    console.log(`  Allowance sufficient (${formatToken(allowance, 6)})`);
    return;
  }

  console.log(`  Approving ${spender} to spend tokens...`);
  const hash = await walletClient.sendTransaction({
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, 2n ** 256n - 1n],
    }),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Approved: ${hash} (status: ${receipt.status})`);
}

async function main() {
  const amountArg = process.argv[2] || '5';
  const amountIn = parseUnits(amountArg, 6); // USDC is 6 decimals

  console.log(`\nSwapping ${amountArg} USDC → USDT via Mento\n`);
  await printBalances();

  // 1. Find route
  console.log('1. Finding route USDC → USDT...');
  const route = await findRoute(USDC, USDT);
  console.log(`   Route: ${route.length}-hop (${route.map((h) => `${h.tokenIn.slice(0, 8)}→${h.tokenOut.slice(0, 8)}`).join(' → ')})`);

  // 2. Get quote
  console.log('\n2. Getting quote...');
  let expectedOut = amountIn;
  for (const hop of route) {
    expectedOut = await publicClient.readContract({
      address: BROKER,
      abi: brokerAbi,
      functionName: 'getAmountOut',
      args: [BIPOOL_MANAGER, hop.exchangeId, hop.tokenIn, hop.tokenOut, expectedOut],
    });
  }
  // expectedOut is USDT (6 decimals)
  console.log(`   Expected: ${formatUnits(expectedOut, 6)} USDT`);

  // 3. Apply 1% slippage for the PoC
  const minOut = (expectedOut * 99n) / 100n;
  console.log(`   Min out (1% slippage): ${formatUnits(minOut, 6)} USDT`);

  // 4. Approve USDC to Broker
  console.log('\n3. Checking USDC approval...');
  await approve(USDC, BROKER, amountIn);

  // 5. Execute swap hops
  console.log('\n4. Executing swap...');
  let lastHash: `0x${string}` | undefined;

  for (let i = 0; i < route.length; i++) {
    const hop = route[i];
    const isLast = i === route.length - 1;
    const hopMinOut = isLast ? minOut : 1n;

    // For intermediate hops, read actual balance of intermediate token
    // and use that exact amount (not 0n) so the Broker knows how much to swap
    let hopAmountIn: bigint;
    let hopDecimals: number;
    if (i === 0) {
      hopAmountIn = amountIn;
      hopDecimals = 6;
    } else {
      // Read intermediate token balance — this is the output from the previous hop
      // We need to figure out how much was received (not the total balance if there was a pre-existing balance)
      const balAfterHop = await publicClient.readContract({
        address: hop.tokenIn,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [WALLET_ADDRESS],
      });
      // Use the fresh quote to estimate what we got from hop 1
      // For USDm (18 decimals), re-quote hop 1 to get expected intermediate amount
      const intermediateQuote = await publicClient.readContract({
        address: BROKER,
        abi: brokerAbi,
        functionName: 'getAmountOut',
        args: [BIPOOL_MANAGER, route[0].exchangeId, route[0].tokenIn, route[0].tokenOut, amountIn],
      });
      // Use the min of (actual balance, intermediate quote + 1%) to avoid using pre-existing funds
      hopAmountIn = intermediateQuote < balAfterHop ? intermediateQuote : balAfterHop;
      hopDecimals = 18; // USDm
      // Approve intermediate token to Broker
      await approve(hop.tokenIn, BROKER, hopAmountIn);
    }

    console.log(`   Hop ${i + 1}: ${formatToken(hopAmountIn, hopDecimals)} (${hopDecimals}dec) → min ${isLast ? formatUnits(hopMinOut, 6) : '0.0001'}`);

    const data = encodeFunctionData({
      abi: brokerAbi,
      functionName: 'swapIn',
      args: [BIPOOL_MANAGER, hop.exchangeId, hop.tokenIn, hop.tokenOut, hopAmountIn, hopMinOut],
    });

    lastHash = await walletClient.sendTransaction({
      to: BROKER,
      data,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: lastHash });
    console.log(`   Tx: ${lastHash} (status: ${receipt.status})`);
  }

  // 6. Show final balances
  console.log('\n5. Final balances:');
  await printBalances();

  console.log('Done!');
}

main().catch(console.error);
