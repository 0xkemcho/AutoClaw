import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const STATE_FILE = join(__dirname, '.state.json');

// Load .env from apps/api/.env (primary) or root .env (fallback)
config({ path: join(ROOT, 'apps', 'api', '.env') });
config({ path: join(ROOT, '.env') });

// Contract addresses
export const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
export const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

// Celo public client (reads)
export const celoClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
});

function normalizeKey(key: string): `0x${string}` {
  const normalized = key.startsWith('0x') ? key : `0x${key}`;
  return normalized as `0x${string}`;
}

// Owner wallet (user wallet) — registers agent, owns the NFT
// Uses TEST_OWNER_KEY (or falls back to TEST_PRIVATE_KEY for backwards compat)
export function getOwnerWalletClient() {
  const key = process.env.TEST_OWNER_KEY || process.env.TEST_PRIVATE_KEY;
  if (!key) {
    console.error('ERROR: TEST_OWNER_KEY (or TEST_PRIVATE_KEY) not set.');
    console.error('Add TEST_OWNER_KEY=0x... to your .env file');
    process.exit(1);
  }
  const account = privateKeyToAccount(normalizeKey(key));
  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}

// Server wallet (agent wallet) — executes trades, gives reputation feedback
// Uses TEST_SERVER_KEY (or falls back to TEST_PRIVATE_KEY for backwards compat)
export function getServerWalletClient() {
  const key = process.env.TEST_SERVER_KEY || process.env.TEST_PRIVATE_KEY;
  if (!key) {
    console.error('ERROR: TEST_SERVER_KEY (or TEST_PRIVATE_KEY) not set.');
    console.error('Add TEST_SERVER_KEY=0x... to your .env file');
    process.exit(1);
  }
  const account = privateKeyToAccount(normalizeKey(key));
  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}

// Print wallet info
export async function printWalletInfo(label: string, address: `0x${string}`) {
  const balance = await celoClient.getBalance({ address });
  console.log(`  ${label}: ${address}`);
  console.log(`  ${label} CELO balance: ${formatEther(balance)}`);
  if (balance === 0n) {
    console.warn(`  WARNING: ${label} has 0 CELO. Transactions will fail without gas funds.`);
  }
}

// State persistence
export interface ScriptState {
  agentId: string;
  txHash: string;
  ownerAddress: string;
  serverAddress?: string;
  registeredAt: string;
}

export function loadState(): ScriptState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveState(state: ScriptState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`  State saved to ${STATE_FILE}`);
}

export function requireState(): ScriptState {
  const state = loadState();
  if (!state?.agentId) {
    console.error('ERROR: No agentId found in .state.json');
    console.error('Run register-agent.ts first:');
    console.error('  npx tsx scripts/erc8004/register-agent.ts');
    process.exit(1);
  }
  return state;
}
