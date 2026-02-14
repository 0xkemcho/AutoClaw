---
title: "feat: Full ERC-8004 Integration (Two-Wallet Pattern)"
type: feat
date: 2026-02-14
---

# Full ERC-8004 Integration

Integrate ERC-8004 (Trustless Agents) into AutoClaw with the two-wallet pattern proven in PoC scripts. User's thirdweb wallet owns the agent NFT, Privy server wallet is linked as agent wallet and submits reputation feedback after trades.

## Architecture

```
Onboarding:
  User wallet (thirdweb) → IdentityRegistry.register(metadataURI)
  User wallet (thirdweb) → IdentityRegistry.setAgentWallet(serverWallet, deadline, sig)

After each trade:
  Server wallet (Privy) → ReputationRegistry.giveFeedback(agentId, score, tags, tradeTxHash)

Dashboard:
  Read on-chain: agent identity, reputation summary, feedback count
```

## Phase 1: Database Migration

Add `agent_8004_id` column to `agent_configs` and create reputation cache table.

- [x] Create `supabase/migrations/20260215000000_add_erc8004_columns.sql`
  - `ALTER TABLE agent_configs ADD COLUMN agent_8004_id bigint DEFAULT NULL`
  - `ALTER TABLE agent_configs ADD COLUMN agent_8004_tx_hash text DEFAULT NULL`
  - No new tables — reputation is read directly from on-chain

## Phase 2: Backend Registration Service

Create `apps/api/src/services/agent-registry.ts` — the core ERC-8004 service.

- [x]`registerAgent(walletAddress, serverWalletAddress, metadataUrl)` — calls `register(agentURI)` from user's thirdweb wallet perspective (frontend signs the tx, backend doesn't sign registration)
  - Actually: since thirdweb wallet signs on frontend, this function stores the result after the frontend tx succeeds
- [x]`saveRegistration(walletAddress, agentId, txHash)` — stores `agent_8004_id` and `agent_8004_tx_hash` in `agent_configs`
- [x]`getAgentReputation(agentId)` — reads `getClients()` + `getSummary()` from ReputationRegistry on-chain
- [x]`submitTradeFeedback(params)` — calls `giveFeedback()` from Privy server wallet after a successful trade
  - `params`: `{ serverWalletId, serverWalletAddress, agentId, direction, currency, txHash }`
  - Value: trade confidence score (0-100)
  - tag1: currency (e.g. "BRLm")
  - tag2: direction ("buy" or "sell")
  - endpoint: `https://autoclaw.xyz`
- [x]`getAgentOnChainInfo(agentId)` — reads ownerOf, tokenURI, getAgentWallet from IdentityRegistry

### Key: Registration happens on the frontend

The user's thirdweb wallet must sign two transactions:
1. `register(agentURI)` — mints the NFT
2. `setAgentWallet(agentId, serverWallet, deadline, signature)` — links server wallet

The **server wallet signs the EIP-712 typed data** for `setAgentWallet` (proves consent to being linked). This signature must be generated server-side and passed to the frontend.

New route needed:
- [x]`POST /api/agent/prepare-8004-link` — server wallet signs EIP-712 `AgentWalletSet` typed data, returns `{ signature, deadline, serverWalletAddress }`

After both txs confirm, frontend calls:
- [x]`POST /api/agent/confirm-8004-registration` — body: `{ agentId, txHash }` — stores in DB

## Phase 3: Metadata Endpoint

- [x]`GET /api/agent/:walletAddress/8004-metadata` in `apps/api/src/routes/agent.ts`
  - Returns JSON per ERC-8004 metadata schema
  - Dynamic: reads user_profiles.display_name, agent_configs.active
  - Response:
    ```json
    {
      "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      "name": "AutoClaw FX Agent — {displayName}",
      "description": "Autonomous FX trading agent on Celo/Mento...",
      "image": "https://autoclaw.xyz/agent-avatar.png",
      "services": [{ "name": "web", "endpoint": "https://autoclaw.xyz" }],
      "x402Support": false,
      "active": true
    }
    ```
  - No auth required (public endpoint, consumed by 8004 indexers)

## Phase 4: Trade Executor Integration

After a successful trade in `agent-cron.ts`, submit reputation feedback.

- [x]In `apps/api/src/services/agent-cron.ts`, after `executeTrade()` succeeds:
  - Call `submitTradeFeedback()` from `agent-registry.ts`
  - Non-blocking: wrap in try/catch, log errors but don't fail the trade cycle
  - Only submit if `agent_8004_id` is set on the config
  - Emit `reputation_submitted` progress event via WebSocket

## Phase 5: Agent Gating

- [x]In `POST /api/agent/toggle` (`apps/api/src/routes/agent.ts`):
  - When activating (newActive = true), check `config.agent_8004_id`
  - If null, return `{ error: 'Agent must be registered on ERC-8004 before activation', code: 'NOT_REGISTERED' }`
  - Status 403

- [x]In `GET /api/agent/status`, include `agent8004Id` in the response so frontend knows registration state

## Phase 6: Frontend — Onboarding Registration Step

Add a third phase to `apps/web/src/app/(auth)/onboarding/page.tsx`.

- [x]Update `Phase` type: `'questionnaire' | 'funding' | 'registration'`
- [x]After funding phase, transition to `registration` phase
- [x]Create `apps/web/src/app/(auth)/onboarding/_components/register-agent.tsx`
  - Shows "Register Your Agent on ERC-8004" card
  - "Register" button triggers thirdweb `sendTransaction()` to `IdentityRegistry.register(metadataUrl)`
  - On success, parse `Registered` event log to get `agentId`
  - Then call `POST /api/agent/prepare-8004-link` to get server wallet signature
  - Then send second tx: `setAgentWallet(agentId, serverAddr, deadline, signature)`
  - Then call `POST /api/agent/confirm-8004-registration` with agentId + txHash
  - Show success state with agent ID + 8004scan link
  - "Skip for now" button → go to dashboard (agent won't be activatable)
  - Loading states, error handling with retry

## Phase 7: Frontend — Dashboard Integration

- [x]Update `agent-status-card.tsx` to show:
  - If registered: "8004 Agent #XX" badge with link to 8004scan
  - If not registered: "Not registered on 8004" warning + "Register" button
- [x]Create `apps/web/src/hooks/use-reputation.ts`
  - `useAgentReputation(agentId)` — calls `GET /api/agent/reputation` (new route)
  - Returns `{ feedbackCount, averageScore, loading }`
- [x]Add `GET /api/agent/reputation` route
  - Reads reputation on-chain via `agent-registry.ts` → `getAgentReputation()`
  - Returns `{ feedbackCount, summaryValue, summaryDecimals, clients }`
- [x]Show reputation score + feedback count on dashboard
  - In agent-status-card or a small reputation section
  - "X feedback | Score: Y" with 8004scan link
- [x]Agent toggle: if not registered, disable toggle and show tooltip "Register on 8004 first"

## Phase 8: Shared Types

- [x]Add to `packages/shared/src/types/agent.ts`:
  ```typescript
  export interface Agent8004Info {
    agentId: number;
    txHash: string;
    owner: string;
    agentWallet: string;
    metadataUri: string;
  }

  export interface Agent8004Reputation {
    feedbackCount: number;
    summaryValue: number;
    summaryDecimals: number;
  }
  ```

- [x]Extend `AgentConfig` interface with `agent8004Id: number | null`
- [x]Extend `AgentStatus` with `agent8004Id: number | null`

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260215000000_add_erc8004_columns.sql` | DB migration |
| `apps/api/src/services/agent-registry.ts` | Core 8004 service |
| `apps/web/src/app/(auth)/onboarding/_components/register-agent.tsx` | Onboarding registration UI |
| `apps/web/src/hooks/use-reputation.ts` | Reputation data hook |

### Modified Files
| File | Change |
|------|--------|
| `apps/api/src/routes/agent.ts` | Add metadata endpoint, registration routes, reputation route, gating in toggle |
| `apps/api/src/services/agent-cron.ts` | Submit reputation after successful trades |
| `apps/web/src/app/(auth)/onboarding/page.tsx` | Add registration phase |
| `apps/web/src/app/(app)/dashboard/_components/agent-status-card.tsx` | 8004 badge + reputation display |
| `packages/shared/src/types/agent.ts` | Add 8004 types |
| `packages/db/src/types.ts` | Add agent_8004_id to Row type |

## Execution Order

1. Phase 1 (DB migration) — no dependencies
2. Phase 8 (shared types) — no dependencies
3. Phase 2 (backend service) — depends on Phase 1 + 8
4. Phase 3 (metadata endpoint) — depends on Phase 2
5. Phase 5 (agent gating) — depends on Phase 2
6. Phase 4 (trade executor) — depends on Phase 2
7. Phase 6 (frontend onboarding) — depends on Phase 2, 3
8. Phase 7 (frontend dashboard) — depends on Phase 5, 6

## Acceptance Criteria

- [x]New agent onboarding shows "Register on 8004" step after funding
- [x]User can register agent → gets NFT on Celo mainnet → server wallet linked
- [x]User can skip registration (but cannot activate agent)
- [x]`POST /api/agent/toggle` blocks activation if not registered
- [x]Dashboard shows 8004 agent ID badge + 8004scan link
- [x]Dashboard shows reputation score + feedback count
- [x]After each successful trade, reputation feedback is auto-submitted on-chain
- [x]Metadata endpoint returns valid ERC-8004 JSON
- [x]All existing tests still pass
