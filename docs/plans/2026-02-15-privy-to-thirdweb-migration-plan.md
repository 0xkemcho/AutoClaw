# Privy → Thirdweb Migration Plan

**Status:** Draft
**Date:** 2026-02-15
**Scope:** Full migration, no backward compatibility. DB can be cleared.

---

## Summary

Replace Privy server wallets with thirdweb server wallets across the platform. Benefits:
- Gasless transactions (EIP-7702 sponsorship on Celo)
- Single provider (thirdweb for auth + wallets)
- Remove Privy dependency and `PRIVY_APP_ID` / `PRIVY_APP_SECRET`

**Keep:** `THIRDWEB_ADMIN_PRIVATE_KEY` for SIWE auth (thirdweb `createAuth` requires it).

---

## Part 1: ERC-8004 Registration → Gasless (Prerequisite)

Replace `getAdminWalletClient()` in agent-registry with a thirdweb server wallet. Use gasless thirdweb API for `register()` and `setAgentWallet()`.

### Identifier Convention

| Wallet | Identifier | Purpose |
|--------|------------|---------|
| ERC-8004 registrar | `erc8004-registrar` | Single platform wallet that mints agent NFTs and links server wallets. Replaces `THIRDWEB_ADMIN_PRIVATE_KEY` for registration only. |

### Files to Modify

- [apps/api/src/services/agent-registry.ts](apps/api/src/services/agent-registry.ts)

### Implementation

1. Add `lib/thirdweb-wallet.ts` (or extend PoC's `thirdweb-api.ts` into `apps/api`):
   - `getOrCreateServerWallet(identifier: string): Promise<{ address: string }>`
   - `sendSponsoredTransaction(params): Promise<{ transactionIds: string[] }>`

2. Create shared "erc8004-registrar" wallet on first use:
   - Call `createServerWallet("erc8004-registrar")` — thirdweb is idempotent for same identifier
   - Cache the address in memory or fetch via GET /v1/wallets/server if needed

3. Replace `getAdminWalletClient()` in `registerAgentOnChain`:
   - Build `register(agentURI)` tx → `sendSponsoredTransaction({ from: registrarAddress, transactions: [tx] })`
   - Build `setAgentWallet(...)` tx → same
   - Remove viem `createWalletClient` + `sendTransaction` for admin

4. **signTypedData for setAgentWallet:** The user's server wallet (Privy today) must sign the EIP-712 message. When we migrate to thirdweb for agent wallets, we need thirdweb's sign API. Check: [thirdweb API sign](https://portal.thirdweb.com/reference) — if no REST endpoint, we may need thirdweb Engine or Vault SDK. **Fallback:** Keep Privy only for `prepareAgentWalletLink` until thirdweb sign API is confirmed; or use thirdweb Engine's `serverWallet().signTypedData()` if available.

### Verification

- Run ERC-8004 registration flow for a new user
- Confirm `register()` and `setAgentWallet()` succeed with gas sponsored
- Agent NFT owned by erc8004-registrar address

---

## Part 2: Full Privy → Thirdweb Migration

### Identifier Conventions

| Wallet | Identifier | Example |
|--------|------------|---------|
| FX agent (per user) | `agent-fx-{walletAddress}` | `agent-fx-0x98F7E3Fc142CE7736956cd79d3F6b164C631A3D9` |
| Yield agent (per user) | `agent-yield-{walletAddress}` | `agent-yield-0x98F7...` |

Lowercase `walletAddress` for consistency. Enables tracking: given identifier, we know user and agent type.

### Database

**No schema change required.** Keep `server_wallet_id` and `server_wallet_address`:
- `server_wallet_id` = thirdweb identifier (e.g. `agent-fx-0x98f7...`)
- `server_wallet_address` = thirdweb-returned address

**Migration:** Clear `agent_configs` (and optionally all agent-related tables). Users re-onboard; new wallets created via thirdweb.

### Files to Create/Modify

| File | Action |
|------|--------|
| `apps/api/src/lib/thirdweb-wallet.ts` | **Create** — `createAgentWallet(walletAddress, agentType)`, `sendTransactionFromServerWallet(address, txs)` |
| `apps/api/src/lib/privy-wallet.ts` | **Delete** |
| `apps/api/src/lib/privy.ts` | **Delete** |
| `apps/api/src/routes/user.ts` | Replace `createAgentWallet` with thirdweb `createServerWallet` |
| `apps/api/src/routes/yield-agent.ts` | Same |
| `apps/api/src/services/trade-executor.ts` | Replace `getAgentWalletClient` + `sendTransaction` with thirdweb API |
| `apps/api/src/services/yield-executor.ts` | Same |
| `apps/api/src/services/agent-registry.ts` | Use thirdweb for `submitTradeFeedback`; use thirdweb for `prepareAgentWalletLink` (sign) if API exists |
| `apps/api/src/services/funding-monitor.ts` | No change (uses address only) |
| `apps/api/package.json` | Remove `@privy-io/node` |
| `apps/api/.env.example` | Remove `PRIVY_APP_ID`, `PRIVY_APP_SECRET` |

### Implementation Order

1. **Phase A: Thirdweb wallet lib**
   - Create `thirdweb-wallet.ts` with:
     - `createServerWallet(identifier)` — POST /v1/wallets/server
     - `sendTransaction(chainId, from, transactions)` — POST /v1/transactions
     - Optional: `signTypedData(from, typedData)` if thirdweb exposes it

2. **Phase B: Wallet creation**
   - `createAgentWallet(walletAddress, agentType: 'fx' | 'yield')`:
     - identifier = `agent-${agentType}-${walletAddress.toLowerCase()}`
     - Call thirdweb createServerWallet
     - Return `{ walletId: identifier, address }`

3. **Phase C: Transaction execution**
   - Replace `getAgentWalletClient().sendTransaction(tx)` with:
     - `sendTransaction({ chainId: 42220, from: serverWalletAddress, transactions: [tx] })`
   - Trade-executor, yield-executor: build tx with viem (encodeFunctionData, etc.), pass to thirdweb API
   - No `feeCurrency` — thirdweb sponsors gas

4. **Phase D: signTypedData**
   - `prepareAgentWalletLink` and any other signTypedData calls need the server wallet to sign
   - Research: thirdweb REST API for sign typed data
   - If unavailable: use thirdweb Engine/TypeScript SDK `Engine.serverWallet({ address }).signTypedData()` — requires pulling in Engine SDK

5. **Phase E: Remove Privy**
   - Delete privy-wallet.ts, privy.ts
   - Remove @privy-io/node
   - Update all imports

6. **Phase F: Tests**
   - Update mocks: replace `getAgentWalletClient` with thirdweb API mocks
   - Run full test suite

### Environment Variables (After Migration)

| Variable | Keep | Remove |
|----------|------|--------|
| `THIRDWEB_SECRET_KEY` | ✓ | |
| `THIRDWEB_ADMIN_PRIVATE_KEY` | ✓ (auth only) | |
| `PRIVY_APP_ID` | | ✓ |
| `PRIVY_APP_SECRET` | | ✓ |

---

## Part 3: DB Reset (Optional)

If clearing DB:

```sql
-- Order matters due to FKs
TRUNCATE agent_timeline CASCADE;
TRUNCATE agent_positions CASCADE;
TRUNCATE agent_configs CASCADE;
-- user_profiles: keep or truncate per preference
```

Or run `supabase db reset` for a full reset.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| thirdweb signTypedData not in REST API | Use Engine SDK or Vault SDK; or defer ERC-8004 link flow until supported |
| thirdweb createServerWallet not idempotent | Call GET /v1/wallets/server, find by identifier; if exists, use address; else create |
| Gas sponsorship limits | Monitor thirdweb usage; upgrade plan if needed |
| Celo chain support | PoC confirmed Celo works; keep monitoring thirdweb changelog |

---

## Rollback

If migration fails:
- Revert code to use Privy
- Restore `PRIVY_APP_ID` / `PRIVY_APP_SECRET`
- DB: if cleared, users must re-onboard anyway; no rollback for data

---

## Checklist

- [ ] Part 1: ERC-8004 registration uses thirdweb gasless (erc8004-registrar)
- [ ] Part 2: createAgentWallet uses thirdweb (agent-fx-{addr}, agent-yield-{addr})
- [ ] Part 2: trade-executor uses thirdweb sendTransaction
- [ ] Part 2: yield-executor uses thirdweb sendTransaction
- [ ] Part 2: agent-registry submitTradeFeedback uses thirdweb
- [ ] Part 2: prepareAgentWalletLink signTypedData — thirdweb or fallback
- [ ] Remove Privy deps and code
- [ ] Update .env.example
- [ ] DB reset (if desired)
- [ ] Full E2E test
