import type { Address } from 'viem';

export const BROKER_ADDRESS: Address =
  '0x777A8255cA72412f0d706dc03C9D1987306B4CaD';

export const BIPOOL_MANAGER_ADDRESS: Address =
  '0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901';

export const CELO_ADDRESS: Address =
  '0x471EcE3750Da237f93B8E339c536989b8978a438';

// USDm (cUSD) — used as hub token for routing
export const USDM_ADDRESS: Address =
  '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// Max uint256 for infinite token approvals
export const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

// Celo fee currency adapters (CIP-64).
// USDC/USDT have 6 decimals but gas math expects 18, so Celo provides adapter contracts.
export const USDC_FEE_ADAPTER: Address =
  '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B';

export const USDT_FEE_ADAPTER: Address =
  '0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72';

// ERC-8004 Agent Registry
export const IDENTITY_REGISTRY_ADDRESS: Address =
  '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

export const REPUTATION_REGISTRY_ADDRESS: Address =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

// Yield agent addresses
export const MERKL_DISTRIBUTOR_ADDRESS: Address =
  '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';

export const ICHI_USDT_WETH_VAULT: Address =
  '0x46689E56aF9b3c9f7D88F2a987264D07C0815e14';

// Uniswap V3 on Celo (https://docs.uniswap.org/contracts/v3/reference/deployments/celo-deployments)
export const UNISWAP_QUOTER_V2: Address =
  '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8';
export const UNISWAP_SWAP_ROUTER_02: Address =
  '0x5615CDAb10dc425a742d643d949a7F474C01abc4';
