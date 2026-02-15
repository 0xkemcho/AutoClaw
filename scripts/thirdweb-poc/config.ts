/**
 * Thirdweb PoC config: Celo chain, token addresses, RPC.
 * Reuses addresses from packages/contracts and packages/shared.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from cwd (run from apps/api: cd apps/api && pnpm tsx ../../scripts/thirdweb-poc/...)
// Or from root: ensure THIRDWEB_SECRET_KEY is in .env or apps/api/.env
config({ path: path.resolve(process.cwd(), 'apps/api/.env') });
config({ path: path.resolve(process.cwd(), '.env') });
config();

export const CELO_CHAIN_ID = 42220;
export const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org';

// Token addresses (Celo mainnet)
export const USDC_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const;
export const USDM_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const;
export const BROKER_ADDRESS = '0x777A8255cA72412f0d706dc03C9D1987306B4CaD' as const;
export const BIPOOL_MANAGER_ADDRESS = '0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901' as const;
export const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export const STATE_FILE = path.resolve(__dirname, 'state.json');
