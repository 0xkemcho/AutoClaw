import { encodeFunctionData, type Address } from 'viem';
import { brokerAbi } from './abis/broker';
import { BIPOOL_MANAGER_ADDRESS, BROKER_ADDRESS } from './addresses';
import type { ExchangeRoute } from './exchanges';

export interface SwapTxData {
  to: Address;
  data: `0x${string}`;
}

/**
 * Build unsigned Mento Broker swapIn transaction(s).
 * For single-hop routes, returns one tx.
 * For multi-hop routes, returns one tx per hop (executed sequentially).
 */
export function buildSwapInTxs(params: {
  route: ExchangeRoute[];
  amountIn: bigint;
  amountOutMin: bigint;
}): SwapTxData[] {
  const { route, amountIn, amountOutMin } = params;

  if (route.length === 0) {
    throw new Error('Empty route — cannot build swap transaction');
  }

  return route.map((hop, i) => {
    // For the last hop, use the user's amountOutMin for slippage protection.
    // For intermediate hops, use 0n (we accept any intermediate amount).
    const hopMinOut = i === route.length - 1 ? amountOutMin : 0n;
    // For the first hop, use the user's amountIn.
    // For subsequent hops, amountIn is the output of the previous hop —
    // but since these are separate txs, the contract handles it via balances.
    // We pass 0n for intermediate amountIn because the broker uses the actual balance.
    const hopAmountIn = i === 0 ? amountIn : 0n;

    return {
      to: BROKER_ADDRESS,
      data: encodeFunctionData({
        abi: brokerAbi,
        functionName: 'swapIn',
        args: [
          BIPOOL_MANAGER_ADDRESS,
          hop.exchangeId,
          hop.tokenIn,
          hop.tokenOut,
          hopAmountIn,
          hopMinOut,
        ],
      }),
    };
  });
}

/**
 * Build a single swapIn tx (convenience for single-hop routes).
 */
export function buildSwapInTx(params: {
  route: ExchangeRoute[];
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
}): SwapTxData {
  const { route, tokenIn, tokenOut, amountIn, amountOutMin } = params;

  if (route.length === 0) {
    throw new Error('Empty route — cannot build swap transaction');
  }

  if (route.length > 1) {
    // For multi-hop, use the first hop tx from buildSwapInTxs
    // Caller should use buildSwapInTxs instead for full multi-hop support
    const txs = buildSwapInTxs({ route, amountIn, amountOutMin });
    return txs[0];
  }

  const hop = route[0];

  return {
    to: BROKER_ADDRESS,
    data: encodeFunctionData({
      abi: brokerAbi,
      functionName: 'swapIn',
      args: [
        BIPOOL_MANAGER_ADDRESS,
        hop.exchangeId,
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
      ],
    }),
  };
}

/**
 * Calculate minimum amount out after applying slippage tolerance.
 * @param amountOut - Expected output amount from getQuote
 * @param slippagePct - Slippage percentage (e.g., 0.5 for 0.5%)
 */
export function applySlippage(amountOut: bigint, slippagePct: number): bigint {
  const basisPoints = BigInt(Math.floor(slippagePct * 100));
  return (amountOut * (10000n - basisPoints)) / 10000n;
}
