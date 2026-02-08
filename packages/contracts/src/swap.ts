import { encodeFunctionData, type Address } from 'viem';
import { brokerAbi } from './abis/broker';
import { BIPOOL_MANAGER_ADDRESS, BROKER_ADDRESS } from './addresses';
import type { ExchangeRoute } from './exchanges';

/**
 * Build an unsigned Mento Broker swapIn transaction.
 * Uses Broker.swapIn(exchangeProvider, exchangeId, tokenIn, tokenOut, amountIn, amountOutMin).
 *
 * For direct swaps (1 hop), encodes the single hop.
 * Multi-hop swaps require the Router contract (not yet supported).
 */
export function buildSwapInTx(params: {
  route: ExchangeRoute[];
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
}): { to: Address; data: `0x${string}` } {
  const { route, tokenIn, tokenOut, amountIn, amountOutMin } = params;

  if (route.length === 0) {
    throw new Error('Empty route — cannot build swap transaction');
  }

  if (route.length > 1) {
    throw new Error(
      'Multi-hop swaps not yet supported via Broker.swapIn. Use Router contract for multi-hop.',
    );
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
