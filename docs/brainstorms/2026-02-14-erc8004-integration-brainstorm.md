---
date: 2026-02-14
topic: erc8004-integration
---

# ERC-8004 Integration for AutoClaw

## What We're Building

Full ERC-8004 (Trustless Agents) integration: every AutoClaw agent auto-registers on the 8004 Identity Registry on Celo during onboarding. The Privy server wallet owns the agent NFT and is linked as the agent's on-chain wallet. After each successful trade, reputation feedback is submitted to the Reputation Registry. The frontend dashboard shows the agent's 8004 identity and reputation. Agents cannot be activated until registered.

## Why This Approach

Three approaches were considered:

- **A: Backend-Only Registration** (chosen) — Registration, wallet linking, reputation, and frontend display. All handled server-side via Privy wallet. Simple, clean, fits existing architecture.
- **B: Smart Contract Wrapper** — Custom on-chain contract wrapping 8004 + trades. Maximum attribution but overkill for hackathon timeline.
- **C: Hybrid with A2A/MCP endpoint** — Everything in A plus a discoverable service endpoint. Marginally better demo story but more work for marginal gain.

Approach A was chosen for simplicity and reliability within hackathon constraints.

## Key Decisions

- **NFT Owner**: Server wallet (Privy) — already signs trades, simplest single-signer model
- **Metadata Hosting**: HTTPS endpoint at `GET /api/agent/:address/8004-metadata` — no IPFS dependency
- **Registration Trigger**: Onboarding step with "Register on 8004" button + "Skip for now" option
- **Agent Gating**: Agent cannot be toggled ON until `agent_8004_id` is set in DB
- **Retry**: Dashboard shows "Register on 8004" button if registration is missing
- **Reputation**: Auto-submitted after each successful trade via `reputationRegistry.giveFeedback()`
- **Gas**: Paid from server wallet's fee currency balance (~$0.01-0.02 per registration on Celo)

## Contracts (Celo Mainnet)

- **IdentityRegistry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (ERC-721, token symbol: AGENT)
- **ReputationRegistry**: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

## Architecture

### New Components

1. **`apps/api/src/services/agent-registry.ts`** — 8004 registration service
   - `registerAgent(config)` — calls `identityRegistry.register(metadataURL)`
   - `linkAgentWallet(agentId, serverWallet)` — calls `setAgentWallet()` with EIP-712 sig
   - `submitTradeFeedback(agentId, tradeResult)` — calls `reputationRegistry.giveFeedback()`
   - `getAgentReputation(agentId)` — reads reputation summary from on-chain

2. **`GET /api/agent/:address/8004-metadata`** — serves dynamic registration JSON
3. **`POST /api/agent/register-8004`** — triggers registration (called from onboarding or dashboard)
4. **`GET /api/agent/reputation`** — returns 8004 reputation data for frontend

### Modified Components

5. **Onboarding flow** (`user.ts`) — add registration step after wallet creation
6. **Trade executor** (`trade-executor.ts`) — submit reputation feedback after successful swaps
7. **Agent toggle** (`agent.ts`) — block activation if `agent_8004_id` is null
8. **DB migration** — add `agent_8004_id` (integer, nullable) to `agent_configs`

### Frontend

9. **Onboarding step** — "Register Agent on 8004" button with skip option
10. **Dashboard** — 8004 agent ID badge, 8004scan link, reputation score/count
11. **Dashboard blocker** — if not registered, show prominent "Register" CTA, disable agent toggle

### Onboarding Flow

```
User completes risk questionnaire
       |
Backend creates Privy server wallet
       |
Show "Register on 8004" step (button + skip)
       |
  +----+----+
  | Register | --> Backend calls identityRegistry.register()
  +---------+     --> Store agent_8004_id --> Dashboard (agent activatable)
  +----+----+
  |   Skip   | --> Store null --> Dashboard (agent NOT activatable)
  +---------+     --> Show "Register" button on dashboard
```

### Metadata Schema

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "AutoClaw FX Agent",
  "description": "Autonomous FX trading agent on Celo/Mento. Analyzes global FX news and executes stablecoin swaps based on AI-driven signals with configurable risk guardrails.",
  "image": "https://autoclaw.xyz/agent-avatar.png",
  "services": [
    {
      "name": "web",
      "endpoint": "https://autoclaw.xyz"
    }
  ],
  "x402Support": false,
  "active": true
}
```

## Open Questions

- None — design is finalized.

## Next Steps

Run `/workflows:plan` to create the implementation plan.
