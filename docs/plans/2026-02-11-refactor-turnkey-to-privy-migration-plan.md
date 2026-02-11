---
title: "refactor: Migrate from Turnkey to Privy Server Wallets"
type: refactor
date: 2026-02-11
---

# Migrate from Turnkey to Privy Server Wallets

Replace Turnkey wallet infrastructure with Privy server wallets (`@privy-io/node`) for agent wallet creation and transaction signing. Privy offers simpler setup (2 env vars vs 3), application-owned wallets without user accounts, and native viem integration.

## Overview

The agent currently uses Turnkey for:
1. Creating HD wallets per user (`createAgentWallet`)
2. Signing transactions via viem (`getAgentWalletClient`)

Privy's server wallet SDK provides the same capabilities with a simpler API surface. This is a greenfield migration — no production users exist with Turnkey wallets.

## Proposed Solution

### Phase 1: Backend Wallet Layer

**Replace `apps/api/src/lib/turnkey.ts`** → `apps/api/src/lib/privy.ts`

```typescript
import { PrivyClient } from '@privy-io/node';

let _privy: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!_privy) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      console.warn('Privy credentials not set — wallet operations disabled');
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET required');
    }
    _privy = new PrivyClient({ appId, appSecret });
  }
  return _privy;
}
```

**Replace `apps/api/src/lib/turnkey-wallet.ts`** → `apps/api/src/lib/privy-wallet.ts`

```typescript
import { createViemAccount } from '@privy-io/node/viem';
import { createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { getPrivyClient } from './privy';

export async function createAgentWallet(userId: string) {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: 'ethereum',
    idempotency_key: `agent-${userId}`,
  });
  return { address: wallet.address, walletId: wallet.id };
}

export async function getAgentWalletClient(walletId: string, address: string) {
  const privy = getPrivyClient();
  const account = createViemAccount(privy, {
    walletId,
    address: address as `0x${string}`,
  });
  return createWalletClient({
    account,
    chain: celo,
    transport: http(),
  });
}
```

**Key API change:** `getAgentWalletClient` now requires both `walletId` and `address` (Turnkey only needed `address`). This changes the function signature and all callers.

### Phase 2: Database Schema

**New migration:** `supabase/migrations/20260212000000_rename_turnkey_to_server_wallet.sql`

```sql
-- Rename columns to vendor-neutral names
ALTER TABLE agent_configs
  RENAME COLUMN turnkey_wallet_address TO server_wallet_address;

ALTER TABLE agent_configs
  RENAME COLUMN turnkey_wallet_id TO server_wallet_id;
```

Using vendor-neutral names (`server_wallet_*`) so future wallet provider changes don't require another rename.

### Phase 3: Type Updates

**`packages/db/src/types.ts`** — Rename fields:
- `turnkey_wallet_address` → `server_wallet_address`
- `turnkey_wallet_id` → `server_wallet_id`

**`packages/shared/src/types/agent.ts`** — Rename fields:
- `turnkeyWalletAddress` → `serverWalletAddress`
- `turnkeyWalletId` → `serverWalletId`

### Phase 4: Service Layer Updates

**`apps/api/src/services/trade-executor.ts`:**
- Import from `../lib/privy-wallet` instead of `../lib/turnkey-wallet`
- Change `executeTrade({ turnkeyAddress, ... })` → `executeTrade({ serverWalletId, serverWalletAddress, ... })`
- Call `getAgentWalletClient(serverWalletId, serverWalletAddress)` (needs both params now)

**`apps/api/src/services/agent-cron.ts`:**
- Pass `config.server_wallet_id` and `config.server_wallet_address` to `executeTrade`

**`apps/api/src/services/funding-monitor.ts`:**
- Change column name string `'turnkey_wallet_address'` → `'server_wallet_address'`

### Phase 5: Route Updates

**`apps/api/src/routes/user.ts`:**
- Import from `../lib/privy-wallet` instead of `../lib/turnkey-wallet`
- `createAgentWallet(userId)` now returns `{ address, walletId }` — store both

**`apps/api/src/routes/agent.ts`:**
- Return `serverWalletAddress` instead of `turnkeyWalletAddress` in GET /api/agent/status

### Phase 6: Frontend Updates

**`apps/web/src/hooks/use-agent.ts`:**
- Rename `turnkeyWalletAddress` → `serverWalletAddress` in `AgentConfig` type

**`apps/web/src/components/settings/settings-form.tsx`:**
- Update `config.turnkeyWalletAddress` → `config.serverWalletAddress`

**`apps/web/src/components/settings/wallet-section.tsx`:**
- Update prop name if needed (currently receives `walletAddress` string — no change needed)

### Phase 7: Config & Env

**`apps/api/.env.example`:**
- Remove: `TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`
- Add: `PRIVY_APP_ID`, `PRIVY_APP_SECRET`

**`apps/api/package.json`:**
- Remove: `@turnkey/api-key-stamper`, `@turnkey/http`, `@turnkey/viem`
- Add: `@privy-io/node`

### Phase 8: Test Updates

**`apps/api/src/test/setup.ts`:**
- Change env vars from `TURNKEY_*` to `PRIVY_*`
- Update mock module paths from `turnkey-wallet` to `privy-wallet`

**`apps/api/src/services/trade-executor.test.ts`:**
- Mock `../lib/privy-wallet` instead of `../lib/turnkey-wallet`
- Update `executeTrade` call to pass `serverWalletId` + `serverWalletAddress`

**`apps/api/src/services/agent-cron.test.ts`:**
- Update fixture fields: `server_wallet_address`, `server_wallet_id`

**`apps/api/src/routes/agent.test.ts`:**
- Update fixture fields and assertion field names

**`apps/api/src/services/funding-monitor.test.ts`:**
- Update column name assertions

### Phase 9: Cleanup

- Delete `apps/api/src/lib/turnkey.ts`
- Delete `apps/api/src/lib/turnkey-wallet.ts`
- Update `.claude/skills/turnkey/SKILL.md` → rename to Privy or remove

## Acceptance Criteria

- [x] `@privy-io/node` installed, `@turnkey/*` packages removed
- [x] `createAgentWallet(userId)` creates a Privy application wallet and returns `{ address, walletId }`
- [x] `getAgentWalletClient(walletId, address)` returns a viem WalletClient that can sign on Celo
- [x] DB columns renamed: `server_wallet_address`, `server_wallet_id`
- [x] All TypeScript types use `serverWalletAddress` / `serverWalletId`
- [x] trade-executor passes both walletId and address to wallet client
- [x] API responses return `serverWalletAddress` (not `turnkeyWalletAddress`)
- [x] Frontend reads `serverWalletAddress` from API
- [x] Env vars: only `PRIVY_APP_ID` and `PRIVY_APP_SECRET` required
- [x] All 125+ existing tests pass with updated mocks
- [x] No remaining references to "turnkey" in implementation files (docs/plans excluded)

## Technical Considerations

- **Idempotency:** `createAgentWallet` uses `idempotency_key: agent-${userId}` — Privy returns the existing wallet if called twice with the same key
- **Lazy init:** PrivyClient is lazily initialized (same pattern as news-fetcher fix) to avoid crashes when env vars are missing
- **walletId storage:** Privy requires `walletId` for signing, so `server_wallet_id` column becomes critical (was optional with Turnkey)
- **Signing model:** Privy handles key custody — no private keys in our infra
- **Rate limits:** 50K free signatures/month, $0.01/signature after that
- **Celo chain:** Privy supports EVM chains; Celo uses CAIP-2 `eip155:42220` for chain-specific operations

## Dependencies & Risks

- **Greenfield assumption:** No production users exist with Turnkey wallets — no data migration needed
- **Privy account required:** Need to create app at console.privy.io and get credentials
- **No new npm packages beyond `@privy-io/node`** — viem integration is included
- **Breaking API change:** `turnkeyWalletAddress` → `serverWalletAddress` in API responses — frontend must be deployed together

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `apps/api/src/lib/privy.ts` |
| Create | `apps/api/src/lib/privy-wallet.ts` |
| Create | `supabase/migrations/20260212000000_rename_turnkey_to_server_wallet.sql` |
| Modify | `packages/db/src/types.ts` |
| Modify | `packages/shared/src/types/agent.ts` |
| Modify | `apps/api/src/services/trade-executor.ts` |
| Modify | `apps/api/src/services/agent-cron.ts` |
| Modify | `apps/api/src/services/funding-monitor.ts` |
| Modify | `apps/api/src/routes/user.ts` |
| Modify | `apps/api/src/routes/agent.ts` |
| Modify | `apps/web/src/hooks/use-agent.ts` |
| Modify | `apps/web/src/components/settings/settings-form.tsx` |
| Modify | `apps/api/src/test/setup.ts` |
| Modify | `apps/api/src/services/trade-executor.test.ts` |
| Modify | `apps/api/src/services/agent-cron.test.ts` |
| Modify | `apps/api/src/routes/agent.test.ts` |
| Modify | `apps/api/src/services/funding-monitor.test.ts` |
| Modify | `apps/api/package.json` |
| Modify | `apps/api/.env.example` |
| Delete | `apps/api/src/lib/turnkey.ts` |
| Delete | `apps/api/src/lib/turnkey-wallet.ts` |

## References

- Privy Server Wallets: https://docs.privy.io/guide/server-wallets
- Privy Node SDK: `@privy-io/node` v0.8.0
- Privy Viem integration: `@privy-io/node/viem` → `createViemAccount`
- Existing Turnkey implementation: `apps/api/src/lib/turnkey.ts`, `apps/api/src/lib/turnkey-wallet.ts`
- Part 1 backend plan: `docs/plans/2026-02-11-feat-fx-agent-backend-foundation-plan.md`
