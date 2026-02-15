import type { Address, PublicClient } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import {
  BASE_TOKENS,
  MENTO_TOKENS,
  COMMODITY_TOKENS,
  getTokenAddress,
  getTokenDecimals,
  USDC_CELO_ADDRESS,
} from '@autoclaw/shared';
import { findRoute, applySlippage } from '@autoclaw/contracts';
import { getWalletBalances } from './dune-balances';
import { executeSwap } from './trade-executor';
import {
  getUniswapQuote,
  executeUniswapSwap,
} from './uniswap-swap';
import { celoClient } from '../lib/celo-client';

const CONVERT_EXTRA_TOKENS = ['WETH', 'WBTC', 'CELO', 'stCELO'] as const;
const UNISWAP_FALLBACK_TOKENS = new Set<string>(CONVERT_EXTRA_TOKENS);

const ALL_SWAP_TOKENS = new Set<string>([
  ...BASE_TOKENS,
  ...MENTO_TOKENS,
  ...COMMODITY_TOKENS,
  ...CONVERT_EXTRA_TOKENS,
]);

const MIN_VALUE_USD = 0.5;

/** Normalize Dune symbol to our token symbol (e.g. USD₮ -> USDT) */
const SYMBOL_ALIASES: Record<string, string> = {
  'USD₮': 'USDT',
  USDT: 'USDT',
};

function normalizeSymbol(symbol: string): string {
  return SYMBOL_ALIASES[symbol] ?? symbol;
}

export interface ConvertSwapped {
  symbol: string;
  amount: string;
  txHash: string;
}

export interface ConvertSkipped {
  symbol: string;
  reason: string;
}

export interface ConvertToUsdcResult {
  swapped: ConvertSwapped[];
  skipped: ConvertSkipped[];
}

export async function convertWalletToUsdc(params: {
  serverWalletId: string;
  serverWalletAddress: string;
}): Promise<ConvertToUsdcResult> {
  const { serverWalletId, serverWalletAddress } = params;
  const swapped: ConvertSwapped[] = [];
  const skipped: ConvertSkipped[] = [];

  const balances = await getWalletBalances(serverWalletAddress);
  const publicClient = celoClient as unknown as PublicClient;
  const usdcAddress = USDC_CELO_ADDRESS as Address;

  for (const b of balances) {
    const valueUsd = b.value_usd ?? 0;
    if (valueUsd < MIN_VALUE_USD) continue;

    const rawSymbol = b.symbol?.trim() ?? '';
    const symbol = normalizeSymbol(rawSymbol);

    if (symbol === 'USDC') continue;

    if (!ALL_SWAP_TOKENS.has(symbol)) {
      skipped.push({ symbol: rawSymbol || symbol, reason: 'Token not supported' });
      continue;
    }

    const tokenAddress = getTokenAddress(symbol) as Address | undefined;
    if (!tokenAddress) {
      skipped.push({ symbol, reason: 'Unknown token address' });
      continue;
    }

    const decimals = getTokenDecimals(symbol);
    const amountRaw = BigInt(b.amount);
    const amountHuman = formatUnits(amountRaw, decimals);

    const mentoRoute = await findRoute(tokenAddress, usdcAddress, publicClient);
    const useUniswap =
      (!mentoRoute || mentoRoute.length === 0) &&
      UNISWAP_FALLBACK_TOKENS.has(symbol);

    try {
      if (mentoRoute && mentoRoute.length > 0) {
        const result = await executeSwap({
          serverWalletId,
          serverWalletAddress,
          from: symbol,
          to: 'USDC',
          amount: amountHuman,
          slippagePct: 0.5,
        });
        swapped.push({
          symbol,
          amount: amountHuman,
          txHash: result.txHash,
        });
      } else if (useUniswap) {
        const usdcDecimals = getTokenDecimals('USDC');
        const amountIn = parseUnits(amountHuman, decimals);
        const quote = await getUniswapQuote({
          tokenIn: tokenAddress,
          tokenOut: usdcAddress,
          amountIn,
          celoClient: publicClient,
        });
        if (!quote) {
          skipped.push({ symbol, reason: 'No Uniswap pool' });
          continue;
        }
        const amountOutMin = applySlippage(quote.amountOut, 0.5);
        const result = await executeUniswapSwap({
          serverWalletId,
          serverWalletAddress,
          tokenIn: tokenAddress,
          tokenOut: usdcAddress,
          amountIn,
          amountOutMin,
          fee: quote.fee,
        });
        swapped.push({
          symbol,
          amount: amountHuman,
          txHash: result.txHash,
        });
      } else {
        skipped.push({ symbol, reason: 'No swap route' });
      }
    } catch (err) {
      skipped.push({
        symbol,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { swapped, skipped };
}
