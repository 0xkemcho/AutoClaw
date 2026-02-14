---
title: ERC-8004 PoC Scripts
type: feat
date: 2026-02-14
---

# ERC-8004 PoC Scripts

## Overview

Create standalone TypeScript scripts that validate all ERC-8004 contract interactions on Celo mainnet before building the full integration. These scripts prove out registration, wallet linking, reputation submission, and data reading against the live IdentityRegistry and ReputationRegistry contracts.

## Problem Statement / Motivation

The hackathon requires registering agents on ERC-8004. Before wiring this into the onboarding flow, trade executor, and frontend, we need to validate that we can:
1. Register an agent (mint ERC-721 NFT)
2. Link a wallet to the agent
3. Submit reputation feedback after trades
4. Read back all agent data and reputation scores

These scripts serve as both validation AND reference implementations for the full integration.

## Proposed Solution

4 standalone scripts in `scripts/erc8004/` + shared utilities (ABIs, config, helpers). Run via `npx tsx scripts/erc8004/<name>.ts`. Use a plain private key for signing (no Privy dependency). Store state in `scripts/erc8004/.state.json`.

## Technical Approach

### Contracts (Celo Mainnet, Chain ID 42220)

| Contract | Address | Implementation |
|----------|---------|----------------|
| IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | IdentityRegistryUpgradeable |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | ReputationRegistryUpgradeable |

### Wallet Strategy

Scripts use a **plain private key** via `TEST_PRIVATE_KEY` env var + viem's `privateKeyToAccount()`. No Privy dependency. The test wallet needs a small amount of CELO for gas (or a stablecoin if using feeCurrency).

### Metadata Strategy

Use a **hardcoded placeholder URL** like `https://autoclaw.xyz/api/agent/test/8004-metadata`. The URL doesn't need to resolve for registration to succeed on-chain — the URI is just stored as a string in the NFT's tokenURI.

### State Management

Scripts share state via `scripts/erc8004/.state.json`:
```json
{
  "agentId": "7",
  "txHash": "0xabc...",
  "registeredAt": "2026-02-14T...",
  "walletAddress": "0x..."
}
```

Register script writes this file. Other scripts read it. If missing, they error with a clear message.

## Implementation Phases

### Phase 1: Shared Infrastructure

#### 1a. Create ABI files

**`packages/contracts/src/abis/identity-registry.ts`**

Export the IdentityRegistry ABI as a `const` array for viem type inference. Key functions needed:

```typescript
export const identityRegistryAbi = [
  // register(string agentURI) → uint256 agentId
  {
    type: 'function',
    name: 'register',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // register() → uint256 agentId (no URI)
  {
    type: 'function',
    name: 'register',
    inputs: [],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // setAgentURI(uint256 agentId, string newURI)
  // setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)
  // getAgentWallet(uint256 agentId) → address
  // unsetAgentWallet(uint256 agentId)
  // setMetadata(uint256 agentId, string metadataKey, bytes metadataValue)
  // getMetadata(uint256 agentId, string metadataKey) → bytes
  // tokenURI(uint256 tokenId) → string
  // ownerOf(uint256 tokenId) → address
  // balanceOf(address owner) → uint256
  // name() → string
  // symbol() → string
  // isAuthorizedOrOwner(address spender, uint256 agentId) → bool
  // Registered event
  // URIUpdated event
  // MetadataSet event
] as const;
```

Use the **full ABI** from the Blockscout-fetched implementation contract (`0x7274e874CA62410a93Bd8bf61c69d8045E399c02`). All entries including errors, events, ERC-721 standard functions, and UUPS upgrade functions.

**`packages/contracts/src/abis/reputation-registry.ts`**

```typescript
export const reputationRegistryAbi = [
  // giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)
  // getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) → (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
  // readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) → (int128, uint8, string, string, bool)
  // readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) → (...)
  // getClients(uint256 agentId) → address[]
  // getLastIndex(uint256 agentId, address clientAddress) → uint64
  // revokeFeedback(uint256 agentId, uint64 feedbackIndex)
  // appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash)
  // getIdentityRegistry() → address
  // NewFeedback event
  // FeedbackRevoked event
  // ResponseAppended event
] as const;
```

Use the **full ABI** from the implementation contract (`0x16e0FA7f7C56B9a767E34B192B51f921BE31dA34`).

#### 1b. Export from packages/contracts

**`packages/contracts/src/addresses.ts`** — Add:
```typescript
export const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
export const REPUTATION_REGISTRY_ADDRESS = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
```

**`packages/contracts/src/index.ts`** — Add exports:
```typescript
export { identityRegistryAbi } from './abis/identity-registry';
export { reputationRegistryAbi } from './abis/reputation-registry';
export { IDENTITY_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ADDRESS } from './addresses';
```

#### 1c. Script helper utilities

**`scripts/erc8004/helpers.ts`** — Shared setup:

```typescript
import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_FILE = new URL('.state.json', import.meta.url).pathname;

// Celo public client (reads)
export const celoClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
});

// Wallet client (writes) — uses TEST_PRIVATE_KEY
export function getTestWalletClient() {
  const key = process.env.TEST_PRIVATE_KEY;
  if (!key) throw new Error('TEST_PRIVATE_KEY not set in .env');
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}

// State persistence
export function loadState(): { agentId: string; txHash: string; walletAddress: string } | null {
  if (!existsSync(STATE_FILE)) return null;
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

export function saveState(state: Record<string, unknown>) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function requireState() {
  const state = loadState();
  if (!state?.agentId) {
    throw new Error('No agentId found. Run 8004-register-agent.ts first.');
  }
  return state;
}
```

### Phase 2: Registration Script

**`scripts/erc8004/register-agent.ts`**

Flow:
1. Load wallet from `TEST_PRIVATE_KEY`
2. Print wallet address and CELO balance
3. Encode `register(agentURI)` call with placeholder metadata URL
4. Send transaction via `walletClient.writeContract()`
5. Wait for receipt (1 confirmation, 60s timeout)
6. Parse `Registered` event from receipt logs to extract `agentId`
7. Save `{ agentId, txHash, walletAddress, registeredAt }` to `.state.json`
8. Print summary: agentId, tx hash, 8004scan link

```typescript
// Pseudocode
const metadataUrl = 'https://autoclaw.xyz/api/agent/test/8004-metadata';

const hash = await walletClient.writeContract({
  address: IDENTITY_REGISTRY_ADDRESS,
  abi: identityRegistryAbi,
  functionName: 'register',
  args: [metadataUrl],
});

const receipt = await celoClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

// Parse Registered event
const registeredLog = parseEventLogs({
  abi: identityRegistryAbi,
  logs: receipt.logs,
  eventName: 'Registered',
});
const agentId = registeredLog[0].args.agentId;

saveState({ agentId: agentId.toString(), txHash: hash, walletAddress: account.address });
console.log(`Agent registered! ID: ${agentId}`);
console.log(`View on 8004scan: https://www.8004scan.io/agents/${agentId}?chain=42220`);
```

**Re-run behavior:** Always registers a new agent (mints new NFT). Overwrites `.state.json` with the latest agentId.

### Phase 3: Read Agent Script

**`scripts/erc8004/read-agent.ts`**

Flow:
1. Load agentId from `.state.json`
2. Call `ownerOf(agentId)` → print owner address
3. Call `tokenURI(agentId)` → print metadata URL
4. Call `getAgentWallet(agentId)` → print linked wallet (likely 0x0 if not set yet)
5. Call `balanceOf(ownerAddress)` → print total agents owned
6. If tokenURI is a fetchable URL (https://), fetch and print the JSON

```typescript
// All read-only, no gas needed
const owner = await celoClient.readContract({
  address: IDENTITY_REGISTRY_ADDRESS,
  abi: identityRegistryAbi,
  functionName: 'ownerOf',
  args: [BigInt(state.agentId)],
});

const uri = await celoClient.readContract({
  address: IDENTITY_REGISTRY_ADDRESS,
  abi: identityRegistryAbi,
  functionName: 'tokenURI',
  args: [BigInt(state.agentId)],
});

const wallet = await celoClient.readContract({
  address: IDENTITY_REGISTRY_ADDRESS,
  abi: identityRegistryAbi,
  functionName: 'getAgentWallet',
  args: [BigInt(state.agentId)],
});

console.log(`Agent #${state.agentId}`);
console.log(`  Owner: ${owner}`);
console.log(`  URI: ${uri}`);
console.log(`  Linked wallet: ${wallet}`);
```

### Phase 4: Give Reputation Script

**`scripts/erc8004/give-reputation.ts`**

Flow:
1. Load agentId from `.state.json`
2. Call `giveFeedback()` with:
   - `agentId`: from state
   - `value`: `85` (int128 — positive = good)
   - `valueDecimals`: `0`
   - `tag1`: `"fx-trade"`
   - `tag2`: `"buy"`
   - `endpoint`: `"https://autoclaw.xyz"`
   - `feedbackURI`: `""` (empty — no off-chain detail for PoC)
   - `feedbackHash`: `0x0000...0000` (bytes32 zero — no hash for PoC)
3. Wait for receipt
4. Parse `NewFeedback` event from logs
5. Print summary

```typescript
const hash = await walletClient.writeContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  abi: reputationRegistryAbi,
  functionName: 'giveFeedback',
  args: [
    BigInt(state.agentId),  // agentId
    85n,                     // value (int128)
    0,                       // valueDecimals (uint8)
    'fx-trade',              // tag1
    'buy',                   // tag2
    'https://autoclaw.xyz',  // endpoint
    '',                      // feedbackURI
    '0x0000000000000000000000000000000000000000000000000000000000000000', // feedbackHash
  ],
});

const receipt = await celoClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
console.log(`Feedback submitted! TX: ${hash}`);
```

**Re-run behavior:** Additive — each run submits a new feedback entry. Can be run multiple times to build up reputation.

### Phase 5: Read Reputation Script

**`scripts/erc8004/read-reputation.ts`**

Flow:
1. Load agentId from `.state.json`
2. Call `getClients(agentId)` → list of addresses that gave feedback
3. Call `getSummary(agentId, clientAddresses, "", "")` → aggregate score
4. Call `readAllFeedback(agentId, clientAddresses, "", "", false)` → individual entries
5. Pretty-print everything

```typescript
const clients = await celoClient.readContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  abi: reputationRegistryAbi,
  functionName: 'getClients',
  args: [BigInt(state.agentId)],
});

const [count, summaryValue, summaryDecimals] = await celoClient.readContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  abi: reputationRegistryAbi,
  functionName: 'getSummary',
  args: [BigInt(state.agentId), clients, '', ''],
});

console.log(`Agent #${state.agentId} Reputation`);
console.log(`  Feedback count: ${count}`);
console.log(`  Average score: ${summaryValue} (decimals: ${summaryDecimals})`);
console.log(`  Unique clients: ${clients.length}`);

// Also read individual feedback entries
const allFeedback = await celoClient.readContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  abi: reputationRegistryAbi,
  functionName: 'readAllFeedback',
  args: [BigInt(state.agentId), clients, '', '', false],
});

// Pretty-print individual entries
```

## File Structure

```
scripts/erc8004/
├── helpers.ts                  # Shared: clients, state management
├── register-agent.ts           # Script 1: Register agent on IdentityRegistry
├── read-agent.ts               # Script 2: Read agent identity data
├── give-reputation.ts          # Script 3: Submit reputation feedback
├── read-reputation.ts          # Script 4: Read reputation data
└── .state.json                 # Auto-generated: persisted agentId (gitignored)

packages/contracts/src/
├── abis/
│   ├── identity-registry.ts    # NEW: Full IdentityRegistry ABI
│   └── reputation-registry.ts  # NEW: Full ReputationRegistry ABI
├── addresses.ts                # MODIFIED: Add 8004 contract addresses
└── index.ts                    # MODIFIED: Export new ABIs and addresses
```

## Environment Variables

Add to `apps/api/.env` (or create `scripts/erc8004/.env`):

```bash
# ERC-8004 PoC Scripts
TEST_PRIVATE_KEY=0x...  # Private key for a funded Celo wallet
CELO_RPC_URL=https://forno.celo.org  # Already exists, reuse
```

## Acceptance Criteria

### Functional Requirements

- [ ] `npx tsx scripts/erc8004/register-agent.ts` successfully mints an AGENT NFT on Celo mainnet and prints the agentId
- [ ] `npx tsx scripts/erc8004/read-agent.ts` reads and prints the agent's owner, tokenURI, and linked wallet
- [ ] `npx tsx scripts/erc8004/give-reputation.ts` submits feedback to the ReputationRegistry and tx confirms
- [ ] `npx tsx scripts/erc8004/read-reputation.ts` reads and prints feedback count, average score, and individual entries
- [ ] State is persisted in `.state.json` between script runs
- [ ] Scripts error clearly if prerequisites aren't met (no private key, no agentId, etc.)
- [ ] Contract ABIs are properly typed and exported from `packages/contracts`

### Quality Gates

- [ ] All scripts handle transaction failures gracefully (reverted tx, timeout)
- [ ] Scripts print transaction hashes and Celoscan links for verification
- [ ] `.state.json` is added to `.gitignore`
- [ ] `TEST_PRIVATE_KEY` is documented in `.env.example` but never committed

## Dependencies & Prerequisites

- **Funded wallet**: The test wallet (`TEST_PRIVATE_KEY`) needs a small amount of CELO for gas (~0.1 CELO should be plenty)
- **No new npm packages**: Uses existing `viem`, `dotenv` from the monorepo
- **No DB access**: Scripts are fully standalone
- **No Privy dependency**: Uses plain private key signing

## Execution Order

```bash
# 1. Fund the test wallet with some CELO for gas
# 2. Set TEST_PRIVATE_KEY in .env

# 3. Register
npx tsx scripts/erc8004/register-agent.ts

# 4. Read identity (can run anytime after step 3)
npx tsx scripts/erc8004/read-agent.ts

# 5. Submit reputation (can run multiple times)
npx tsx scripts/erc8004/give-reputation.ts

# 6. Read reputation (run after step 5)
npx tsx scripts/erc8004/read-reputation.ts
```

## References & Research

### Internal References
- Privy wallet signing: `apps/api/src/lib/privy-wallet.ts`
- Celo client setup: `apps/api/src/lib/celo-client.ts`
- Contract ABI pattern: `packages/contracts/src/abis/broker.ts`
- Transaction execution: `apps/api/src/services/trade-executor.ts`
- Brainstorm: `docs/brainstorms/2026-02-14-erc8004-integration-brainstorm.md`

### External References
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- IdentityRegistry on Celo: https://celoscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
- ReputationRegistry on Celo: https://celoscan.io/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
- 8004scan agent explorer: https://www.8004scan.io/agents
- ERC-8004 contracts repo: https://github.com/erc-8004/erc-8004-contracts
