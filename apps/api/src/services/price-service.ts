import { parseUnits, formatUnits, type Address } from 'viem';
import { celoClient } from '../lib/celo-client.js';
import {
  MENTO_TOKENS,
  MENTO_TOKEN_ADDRESSES,
  type MentoToken,
} from '@autoclaw/shared';

const BROKER_ADDRESS = '0x777A8255cA72412f0d706dc03C9D1987306B4CaD' as const;
const BIPOOL_MANAGER_ADDRESS =
  '0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901' as const;

// USDm (cUSD) is the reference dollar stablecoin — its price IS $1.00
const USDM_ADDRESS =
  MENTO_TOKEN_ADDRESSES.USDm.toLowerCase() as Address;

// CELO native asset ERC-20 wrapper
const CELO_ADDRESS =
  '0x471EcE3750Da237f93B8E339c536989b8978a438'.toLowerCase() as Address;

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
          {
            name: 'assets',
            type: 'address[]',
          },
        ],
      },
    ],
  },
] as const;

// Maps token symbol → list of routes to reach USDm
interface ExchangeRoute {
  exchangeId: `0x${string}`;
  tokenIn: Address;
  tokenOut: Address;
}

type PriceRoute = ExchangeRoute[]; // 1-hop or 2-hop

const lastKnownPrices = new Map<string, number>();
let routeCache: Map<string, PriceRoute> | null = null;

/**
 * Discover exchange pools and build routing table.
 * Each Mento token either pairs directly with USDm (cUSD)
 * or pairs with CELO — in which case we route Token→CELO then CELO→USDm.
 */
async function buildRoutes(): Promise<Map<string, PriceRoute>> {
  if (routeCache) return routeCache;

  const exchanges = await celoClient.readContract({
    address: BIPOOL_MANAGER_ADDRESS,
    abi: biPoolManagerAbi,
    functionName: 'getExchanges',
  });

  // Build lookup: for each pair of assets, store the exchangeId
  const pairToExchange = new Map<string, `0x${string}`>();
  for (const { exchangeId, assets } of exchanges) {
    if (assets.length >= 2) {
      const a0 = assets[0].toLowerCase();
      const a1 = assets[1].toLowerCase();
      // Store both directions
      pairToExchange.set(`${a0}:${a1}`, exchangeId);
      pairToExchange.set(`${a1}:${a0}`, exchangeId);
    }
  }

  const routes = new Map<string, PriceRoute>();

  for (const token of MENTO_TOKENS) {
    if (token === 'USDm') continue; // USDm IS the dollar reference

    const tokenAddr = MENTO_TOKEN_ADDRESSES[token].toLowerCase() as Address;

    // Try direct: Token → USDm
    const directKey = `${tokenAddr}:${USDM_ADDRESS}`;
    const directExchange = pairToExchange.get(directKey);
    if (directExchange) {
      routes.set(token, [
        {
          exchangeId: directExchange,
          tokenIn: tokenAddr,
          tokenOut: USDM_ADDRESS,
        },
      ]);
      continue;
    }

    // Try 2-hop: Token → CELO, then CELO → USDm
    const toCeloKey = `${tokenAddr}:${CELO_ADDRESS}`;
    const celoToUsdKey = `${CELO_ADDRESS}:${USDM_ADDRESS}`;
    const toCeloExchange = pairToExchange.get(toCeloKey);
    const celoToUsdExchange = pairToExchange.get(celoToUsdKey);

    if (toCeloExchange && celoToUsdExchange) {
      routes.set(token, [
        {
          exchangeId: toCeloExchange,
          tokenIn: tokenAddr,
          tokenOut: CELO_ADDRESS,
        },
        {
          exchangeId: celoToUsdExchange,
          tokenIn: CELO_ADDRESS,
          tokenOut: USDM_ADDRESS,
        },
      ]);
      continue;
    }

    // Try 2-hop: Token → USDm via CELO (reverse: USDm → CELO → Token, but we want Token → USDm)
    // Also try: Token → CELO via any exchange, CELO → USDm
    // If still no route, log a warning
    console.warn(
      `No route found for ${token} (${tokenAddr}). Available pairs with this token:`,
      [...pairToExchange.keys()].filter((k) => k.includes(tokenAddr)),
    );
  }

  console.log(
    `Built routes for ${routes.size} tokens:`,
    Object.fromEntries(
      [...routes.entries()].map(([k, v]) => [
        k,
        v.length === 1 ? 'direct→USDm' : `${v.length}-hop→USDm`,
      ]),
    ),
  );

  routeCache = routes;
  return routes;
}

async function fetchMentoPrice(
  token: MentoToken,
  route: PriceRoute,
): Promise<number | null> {
  try {
    // Start with 1 token (18 decimals for all Mento tokens)
    let currentAmount = parseUnits('1', 18);

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

    // Final output is in USDm (18 decimals) = USD value
    const price = parseFloat(formatUnits(currentAmount, 18));
    if (price > 0) {
      lastKnownPrices.set(token, price);
    }
    return price;
  } catch (err) {
    console.warn(`Failed to fetch price for ${token}:`, err);
    return lastKnownPrices.get(token) ?? null;
  }
}

async function fetchXautPrice(): Promise<number> {
  try {
    const res: any = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd',
    );
    const data = (await res.json()) as {
      'tether-gold'?: { usd?: number };
    };
    const price = data['tether-gold']?.usd;
    if (price && price > 0) {
      lastKnownPrices.set('XAUT', price);
      return price;
    }
  } catch (err) {
    console.warn('Failed to fetch XAUT price from CoinGecko:', err);
  }
  return lastKnownPrices.get('XAUT') ?? 2800;
}

export async function fetchAllPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  // USDm is the dollar reference
  prices.set('USDm', 1.0);
  lastKnownPrices.set('USDm', 1.0);

  const [routes, xautPrice] = await Promise.all([
    buildRoutes(),
    fetchXautPrice(),
  ]);

  prices.set('XAUT', xautPrice);

  const results = await Promise.allSettled(
    MENTO_TOKENS.filter((t) => t !== 'USDm').map(async (token) => {
      const route = routes.get(token);
      if (!route) {
        return { token, price: lastKnownPrices.get(token) ?? null };
      }
      const price = await fetchMentoPrice(token, route);
      return { token, price };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.price !== null) {
      prices.set(result.value.token, result.value.price!);
    }
  }

  return prices;
}
