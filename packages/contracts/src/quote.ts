import { formatUnits, type Address, type PublicClient } from 'viem';
import { brokerAbi } from './abis/broker';
import { BIPOOL_MANAGER_ADDRESS, BROKER_ADDRESS } from './addresses';
import { findRoute, type ExchangeRoute } from './exchanges';

export interface QuoteResult {
  amountOut: bigint;
  exchangeProvider: Address;
  exchangeId: `0x${string}`;
  rate: number;
  route: ExchangeRoute[];
}

/**
 * Get a swap quote from the Mento Broker.
 * Supports both direct and multi-hop routes.
 */
export async function getQuote(params: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  celoClient: PublicClient;
}): Promise<QuoteResult> {
  const { tokenIn, tokenOut, amountIn, tokenInDecimals, tokenOutDecimals, celoClient } = params;

  const route = await findRoute(tokenIn, tokenOut, celoClient);
  if (!route || route.length === 0) {
    throw new Error(
      `No exchange route found for ${tokenIn} → ${tokenOut}`,
    );
  }

  // Walk the route: for each hop, get the output amount
  let currentAmount = amountIn;
  for (const hop of route) {
    currentAmount = await celoClient.readContract({
      address: BROKER_ADDRESS,
      abi: brokerAbi,
      functionName: 'getAmountOut',
      args: [
        BIPOOL_MANAGER_ADDRESS,
        hop.exchangeId,
        hop.tokenIn,
        hop.tokenOut,
        currentAmount,
      ],
    });
  }

  // Calculate human-readable rate: (amountOut / 10^outDecimals) / (amountIn / 10^inDecimals)
  const amountInFloat = parseFloat(formatUnits(amountIn, tokenInDecimals));
  const amountOutFloat = parseFloat(formatUnits(currentAmount, tokenOutDecimals));
  const rate = amountInFloat > 0 ? amountOutFloat / amountInFloat : 0;

  return {
    amountOut: currentAmount,
    exchangeProvider: BIPOOL_MANAGER_ADDRESS,
    exchangeId: route[0].exchangeId,
    rate,
    route,
  };
}
