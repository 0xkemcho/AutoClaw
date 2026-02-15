# Vercel Build Type Errors: authorizationList Required

## The Error

```
Error: src/services/agent-cron.ts(432,49): error TS2345:
Argument of type '{ address: Address; abi: ...; functionName: "balanceOf"; args: [...] }'
is not assignable to parameter of type 'ReadContractParameters<...>'.
  Property 'authorizationList' is missing in type '...' but required in type '...'
```

## Root Cause

**Multiple viem versions in dependency tree** cause TypeScript to resolve types from different versions:

```bash
$ pnpm why viem
dependencies:
@autoclaw/contracts -> viem 2.44.4 ✅ (what we want)
thirdweb -> viem 2.39.0 ❌ (transitive)
@walletconnect/utils -> viem 2.31.0 ❌ (transitive)
```

In Vercel's fresh install environment, TypeScript sometimes resolves `ReadContractParameters` from viem 2.39.0 or 2.31.0, which have a type bug where `authorizationList` (an EIP-7702 parameter for **write** operations) is incorrectly marked as **required** for **read-only** `eth_call` operations.

## Why Only Vercel Fails

| Factor | Local | Vercel |
|--------|-------|--------|
| **Install** | Incremental/cached | Fresh install every build |
| **node_modules layout** | May vary based on install history | Deterministic but different from local |
| **TypeScript resolution** | Resolves from cached layout | May pick different viem version |
| **Hoisting** | pnpm hoisting + local cache | Fresh pnpm hoisting |

The issue is **non-deterministic** - it depends on which viem version TypeScript happens to resolve first when checking `ReadContractParameters` types.

## Solution 1: Lock viem to Single Version ✅ (FINAL)

**Status**: Applied - viem locked to `2.39.0` everywhere

Pin viem to exactly the same version across all packages to eliminate type resolution conflicts:

```json
// apps/api/package.json
"viem": "2.39.0"  // matches thirdweb dependency

// packages/contracts/package.json
"viem": "2.39.0"
```

This ensures TypeScript always resolves `ReadContractParameters` from the same viem version, regardless of install order or pnpm hoisting behavior.

**Why 2.39.0?** This is the version thirdweb uses, so locking to it means fewer duplicate viem installations.

## Solution 2: Use getErc20Balance Helper (ALSO APPLIED)

**Status**: Applied for robustness

Replace `celoClient.readContract()` calls with `getErc20Balance()` from `@autoclaw/contracts`:

```typescript
import { getErc20Balance } from '@autoclaw/contracts';

// Before (fails in some build environments)
const balance = await celoClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [walletAddress],
});

// After (works everywhere)
const balance = await getErc20Balance({
  token: tokenAddress,
  account: walletAddress,
  client: celoClient,
});
```

### How getErc20Balance Works

Uses `encodeFunctionData` + `call` + `decodeFunctionResult` pattern:

```typescript
export async function getErc20Balance(params: {
  token: Address;
  account: Address;
  client: EthCallClient;
}): Promise<bigint> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  });
  const result = await client.call({ to: token, data });
  return decodeFunctionResult({
    abi: erc20Abi,
    functionName: 'balanceOf',
    data: result.data ?? '0x',
  });
}
```

This bypasses `ReadContractParameters` types entirely, avoiding the `authorizationList` type conflict.

## Files Updated

- ✅ `apps/api/src/services/agent-cron.ts` — `getOnChainBalances()`
- ✅ `packages/contracts/src/allowance.ts` — `getErc20Balance()` helper

## Alternative Solutions (Not Needed)

### 1. Downgrade viem (Partial Fix)

Downgrading to `~2.44.0` helps but doesn't fully solve the issue because transitive dependencies still bring in viem 2.39.0 and 2.31.0.

### 2. Type Assertions (Hacky)

```typescript
const balance = await celoClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [walletAddress],
} as any); // Suppresses type error but risky
```

Avoid this approach - it hides type safety issues.

### 3. Override TypeScript moduleResolution (Nuclear)

Could force `"moduleResolution": "node"` but this breaks other modern TypeScript features.

## Lesson Learned

When working with monorepos that have multiple versions of the same package (especially type-heavy libraries like viem), prefer **runtime-based patterns** (encode/call/decode) over **high-level typed wrappers** (readContract) for critical paths that must work across different build environments.

The type safety loss is minimal because we still type the function parameters explicitly, and the pattern is more resilient to transitive dependency version conflicts.
