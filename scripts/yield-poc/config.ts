import 'dotenv/config';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

// --- Test Wallet ---
const TEST_SERVER_KEY = process.env.TEST_SERVER_KEY;
if (!TEST_SERVER_KEY) throw new Error('TEST_SERVER_KEY not set in .env');

export const account = privateKeyToAccount(`0x${TEST_SERVER_KEY}` as `0x${string}`);
export const WALLET_ADDRESS = account.address;

// --- Clients ---
const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org';

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(RPC_URL),
});

export const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(RPC_URL),
});

// --- Token Addresses (Celo) ---
export const USDC: Address = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
export const USDT: Address = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
export const WETH: Address = '0xD221812de1BD094f35587EE8E174B07B6167D9Af';
export const WBTC: Address = '0x8aC2901Dd8A1F17a1A4768A6bA4C3751e3995B2D';
export const USDM: Address = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// --- Ichi Vault (USDT-WETH, 32% APR) ---
export const ICHI_VAULT: Address = '0x46689E56aF9b3c9f7D88F2A987264D07C0815e14';

// --- Merkl ---
export const MERKL_DISTRIBUTOR: Address = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';
export const MERKL_API_BASE = 'https://api.merkl.xyz/v4';

// --- Mento ---
export const BROKER: Address = '0x777A8255cA72412f0d706dc03C9D1987306B4CaD';
export const BIPOOL_MANAGER: Address = '0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901';

// Fee currency adapters for CIP-64 gas payments
export const USDC_FEE_ADAPTER: Address = '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B';

// --- ABIs ---
export const erc20Abi = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

export const ichiVaultAbi = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'deposit0', type: 'uint256' }, { name: 'deposit1', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [{ name: 'shares', type: 'uint256' }] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'shares', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }] },
  { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'token1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'allowToken0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowToken1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getTotalAmounts', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'total0', type: 'uint256' }, { name: 'total1', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'deposit0Max', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'deposit1Max', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const merklDistributorAbi = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'users', type: 'address[]' }, { name: 'tokens', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'proofs', type: 'bytes32[][]' }], outputs: [] },
  { name: 'claimed', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: 'amount', type: 'uint208' }, { name: 'timestamp', type: 'uint48' }, { name: 'merkleRoot', type: 'bytes32' }] },
] as const;

// --- Helpers ---
export function formatToken(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0.0000';
  const str = amount.toString();
  if (str.length <= decimals) {
    const padded = str.padStart(decimals, '0');
    return `0.${padded.slice(0, 6)}`;
  }
  const intPart = str.slice(0, str.length - decimals);
  const fracPart = str.slice(str.length - decimals).padEnd(6, '0').slice(0, 6);
  return `${intPart}.${fracPart}`;
}

export async function getBalance(token: Address, address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
}

export async function printBalances() {
  const [usdc, usdt, weth, usdm] = await Promise.all([
    getBalance(USDC, WALLET_ADDRESS),
    getBalance(USDT, WALLET_ADDRESS),
    getBalance(WETH, WALLET_ADDRESS),
    getBalance(USDM, WALLET_ADDRESS),
  ]);
  const vaultShares = await publicClient.readContract({
    address: ICHI_VAULT,
    abi: ichiVaultAbi,
    functionName: 'balanceOf',
    args: [WALLET_ADDRESS],
  });

  console.log(`\n--- Wallet ${WALLET_ADDRESS} ---`);
  console.log(`  USDC:         ${formatToken(usdc, 6)}`);
  console.log(`  USDT:         ${formatToken(usdt, 6)}`);
  console.log(`  WETH:         ${formatToken(weth, 18)}`);
  console.log(`  USDm:         ${formatToken(usdm, 18)}`);
  console.log(`  Ichi LP:      ${formatToken(vaultShares, 18)}`);
  console.log('');
}
