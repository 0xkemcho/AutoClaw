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
  flag?: string;
  decimals?: number;
}

export interface MarketTokensResponse {
  tokens: TokenInfo[];
  updatedAt: string;
}

export const MENTO_TOKEN_ADDRESSES: Record<MentoToken, string> = {
  USDm: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  EURm: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  BRLm: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
  KESm: '0x456a3D042C0DbD3db53D5489e98dFb038553B0d0',
  PHPm: '0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B',
  COPm: '0x8A567e2aE79CA692Bd748aB832081C45de4041eA',
  XOFm: '0x73F93dcc49cB8A239e2032663e9475dd5ef29A08',
  NGNm: '0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71',
  JPYm: '0xc45eCF20f3CD864B32D9794d6f76814aE8892e20',
  CHFm: '0xb55a79F398E759E43C95b979163f30eC87Ee131D',
  ZARm: '0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6',
  GBPm: '0xCCF663b1fF11028f0b19058d0f7B674004a40746',
  AUDm: '0x7175504C455076F15c04A2F90a8e352281F492F9',
  CADm: '0xff4Ab19391af240c311c54200a492233052B6325',
  GHSm: '0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313',
};

export const USDC_CELO_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
export const USDT_CELO_ADDRESS = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
// WARNING: XAUT is NOT tradeable — excluded from TARGET_TOKENS and ALL_TOKEN_ADDRESSES until a real Celo address is available
export const XAUT_CELO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const BASE_TOKEN_ADDRESSES: Record<BaseToken, string> = {
  USDC: USDC_CELO_ADDRESS,
  USDT: USDT_CELO_ADDRESS,
};

export const ALL_TOKEN_ADDRESSES: Record<string, string> = {
  ...MENTO_TOKEN_ADDRESSES,
  USDC: USDC_CELO_ADDRESS,
  USDT: USDT_CELO_ADDRESS,
};

export const TOKEN_METADATA: Record<
  string,
  { name: string; flag: string; decimals: number; logo?: string }
> = {
  USDm: { name: 'Mento Dollar', flag: '🇺🇸', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb311ace18bb8ade8b7c5_USDm%20(Mento%20Dollar).svg' },
  EURm: { name: 'Mento Euro', flag: '🇪🇺', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2f0fa2216acb6660d4c_EURm%20(Mento%20Euro).svg' },
  BRLm: { name: 'Mento Real', flag: '🇧🇷', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/69677217767a74c2cb01e39f_BRLm.svg' },
  KESm: { name: 'Mento Shilling', flag: '🇰🇪', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2d6bcbd3be3bbd56750_KESm%20(Mento%20Kenyan%20Shilling).svg' },
  PHPm: { name: 'Mento Peso', flag: '🇵🇭', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2cbc65e6fd0859c5161_PHPm%20(Mento%20Philippine%20Peso).svg' },
  COPm: { name: 'Mento Peso', flag: '🇨🇴', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb234ccfb118a64e16f1f_COPm%20(Mento%20Colombian%20Peso).svg' },
  XOFm: { name: 'Mento CFA Franc', flag: '🇸🇳', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb16e02aa5e97e5fa3ce7_XOFm%20(Mento%20West%20African%20CFA%20franc).svg' },
  NGNm: { name: 'Mento Naira', flag: '🇳🇬', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2c00879d1a053306bb8_NGNm%20(Mento%20Nigerian%20Naira).svg' },
  JPYm: { name: 'Mento Yen', flag: '🇯🇵', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2ac97027e7b9c1a7ed2_JPYm%20(Mento%20Japanese%20Yen).svg' },
  CHFm: { name: 'Mento Franc', flag: '🇨🇭', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb29cafd31ab0f953cff0_CHFm%20(Mento%20Swiss%20Franc).svg' },
  ZARm: { name: 'Mento Rand', flag: '🇿🇦', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2830138d7e4cfcee45a_ZARm%20(South%20African%20Rand).svg' },
  GBPm: { name: 'Mento Pound', flag: '🇬🇧', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2790ca77dcbce98890b_GBPm%20%20(Mento%20British%20Pound).svg' },
  AUDm: { name: 'Mento AUD', flag: '🇦🇺', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb19dd80a06cbedcde486_AUD%20(Mento%20Australian%20Dollar).svg' },
  CADm: { name: 'Mento CAD', flag: '🇨🇦', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/6967722a396ccc2ea6a333b7_CADm.svg' },
  GHSm: { name: 'Mento Cedi', flag: '🇬🇭', decimals: 18, logo: 'https://cdn.prod.website-files.com/6807f97b456d6dff3e784225/695bb2658ae1324a51d4d86b_GHSm%20(Mento%20Ghanaian%20Cedi).svg' },
  USDC: { name: 'USD Coin', flag: '🇺🇸', decimals: 6 },
  USDT: { name: 'Tether USD', flag: '🇺🇸', decimals: 6 },
  XAUT: { name: 'Tether Gold', flag: '🥇', decimals: 6 },
};

/** Get the number of decimals for a token symbol. */
export function getTokenDecimals(symbol: string): number {
  return TOKEN_METADATA[symbol]?.decimals ?? 18;
}

/** Resolve a token symbol to its on-chain address. Returns undefined if unknown. */
export function getTokenAddress(symbol: string): string | undefined {
  return ALL_TOKEN_ADDRESSES[symbol];
}

/** All tradeable target tokens (Mento stables only). */
export const TARGET_TOKENS = [...MENTO_TOKENS] as const; // XAUT excluded until real address available
export type TargetToken = (typeof TARGET_TOKENS)[number];
