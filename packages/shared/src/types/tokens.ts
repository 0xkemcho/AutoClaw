export const MENTO_TOKENS = [
  'USDm',
  'EURm',
  'BRLm',
  'KESm',
  'PHPm',
  'COPm',
  'XOFm',
  'NGNm',
  'JPYm',
  'CHFm',
  'ZARm',
  'GBPm',
  'AUDm',
  'CADm',
  'GHSm',
] as const;

export type MentoToken = (typeof MENTO_TOKENS)[number];

export const BASE_TOKENS = ['USDC', 'USDT'] as const;
export type BaseToken = (typeof BASE_TOKENS)[number];

export const COMMODITY_TOKENS = ['XAUT'] as const;
export type CommodityToken = (typeof COMMODITY_TOKENS)[number];

export type SupportedToken = MentoToken | BaseToken | CommodityToken;

export interface TokenInfo {
  symbol: SupportedToken;
  name: string;
  priceUsd: number;
  change24hPct: number;
  sparkline7d: number[];
}
