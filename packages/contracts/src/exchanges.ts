import type { Address, PublicClient } from 'viem';
import { biPoolManagerAbi } from './abis/bipool-manager.js';
import { BIPOOL_MANAGER_ADDRESS, CELO_ADDRESS, USDM_ADDRESS } from './addresses.js';

export interface ExchangeRoute {
  exchangeId: `0x${string}`;
  tokenIn: Address;
  tokenOut: Address;
}

type PriceRoute = ExchangeRoute[];

let routeCache: Map<string, PriceRoute> | null = null;
let routeCacheTimestamp = 0;
const ROUTE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Discover exchange pools and build a routing table.
 * Caches results for 5 minutes.
 */
export async function getRoutes(
  celoClient: PublicClient,
): Promise<Map<string, PriceRoute>> {
  if (routeCache && Date.now() - routeCacheTimestamp < ROUTE_CACHE_TTL) {
    return routeCache;
  }

  const exchanges = await celoClient.readContract({
    address: BIPOOL_MANAGER_ADDRESS,
    abi: biPoolManagerAbi,
    functionName: 'getExchanges',
  });

  // Build pair → exchangeId lookup (both directions)
  const pairToExchange = new Map<string, `0x${string}`>();
  for (const { exchangeId, assets } of exchanges) {
    if (assets.length >= 2) {
      const a0 = assets[0].toLowerCase();
      const a1 = assets[1].toLowerCase();
      pairToExchange.set(`${a0}:${a1}`, exchangeId);
      pairToExchange.set(`${a1}:${a0}`, exchangeId);
    }
  }

  routeCache = pairToExchange as unknown as Map<string, PriceRoute>;
  // Store the raw pair map so we can use it in findRoute
  _pairToExchange = pairToExchange;
  routeCacheTimestamp = Date.now();

  return routeCache;
}

let _pairToExchange: Map<string, `0x${string}`> | null = null;

// Hub tokens to try for 2-hop routing (order matters — try USDm first, then CELO)
const HUB_TOKENS: Address[] = [USDM_ADDRESS, CELO_ADDRESS];

/**
 * Find a swap route between two tokens.
 * Tries direct route first, then 2-hop via each hub token (USDm, CELO).
 */
export async function findRoute(
  tokenIn: Address,
  tokenOut: Address,
  celoClient: PublicClient,
): Promise<PriceRoute | null> {
  // Ensure routes are built
  await getRoutes(celoClient);
  if (!_pairToExchange) return null;

  const inAddr = tokenIn.toLowerCase();
  const outAddr = tokenOut.toLowerCase();

  // Direct route
  const directKey = `${inAddr}:${outAddr}`;
  const directExchange = _pairToExchange.get(directKey);
  if (directExchange) {
    return [
      {
        exchangeId: directExchange,
        tokenIn: tokenIn,
        tokenOut: tokenOut,
      },
    ];
  }

  // 2-hop via hub tokens (try USDm first, then CELO)
  for (const hubToken of HUB_TOKENS) {
    const hub = hubToken.toLowerCase();
    // Skip if hub is the same as input or output
    if (hub === inAddr || hub === outAddr) continue;

    const toHubKey = `${inAddr}:${hub}`;
    const hubToOutKey = `${hub}:${outAddr}`;
    const toHubExchange = _pairToExchange.get(toHubKey);
    const hubToOutExchange = _pairToExchange.get(hubToOutKey);

    if (toHubExchange && hubToOutExchange) {
      return [
        {
          exchangeId: toHubExchange,
          tokenIn: tokenIn,
          tokenOut: hubToken,
        },
        {
          exchangeId: hubToOutExchange,
          tokenIn: hubToken,
          tokenOut: tokenOut,
        },
      ];
    }
  }

  return null;
}

/** Clear the route cache (useful for testing or forced refresh). */
export function clearRouteCache() {
  routeCache = null;
  _pairToExchange = null;
  routeCacheTimestamp = 0;
}
