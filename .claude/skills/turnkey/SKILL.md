---
name: turnkey
description: 'Privy server wallets for server-side wallet creation and signing. Use when working with Privy wallets, server-side transaction signing, custodial wallets, or automated trading wallets. Triggers on: "privy", "server wallet", "custodial wallet", "privy signing", "automated wallet", "@privy-io/node".'
---

## Overview

Privy provides server-side wallet management for AutoClaw. Use it for:
- Creating application-owned wallets on the server (no private key exposure)
- Signing transactions server-side for automated trading
- Integration with viem via `@privy-io/node/viem`

## Installation

```bash
pnpm add @privy-io/node
```

## Authentication

Privy uses App ID + App Secret from the Privy dashboard (console.privy.io).

```ts
import { PrivyClient } from '@privy-io/node';

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});
```

## Wallet Creation

```ts
// Create an application-owned wallet (no Privy user needed)
const wallet = await privy.wallets().create({
  chain_type: 'ethereum',
  idempotency_key: `agent-${userId}`,
});

const { id: walletId, address } = wallet;
```

## Signing with Viem

```ts
import { createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { createViemAccount } from '@privy-io/node/viem';

const account = await createViemAccount(privy, {
  walletId,
  address: walletAddress as `0x${string}`,
});

const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(process.env.CELO_RPC_URL),
});

// Sign and send transactions
const hash = await walletClient.sendTransaction({
  to: '0x...',
  data: '0x...',
  value: 0n,
});
```

## Environment Variables

| Variable | Description |
|---|---|
| `PRIVY_APP_ID` | App ID from Privy dashboard |
| `PRIVY_APP_SECRET` | App secret from Privy dashboard |

## Integration with Mento Swaps

For automated trading, combine Privy signing with Mento swap transactions:

```ts
import { buildSwapInTx } from '@autoclaw/contracts';

const swapTx = buildSwapInTx({ route, tokenIn, tokenOut, amountIn, amountOutMin });

const hash = await walletClient.sendTransaction({
  to: swapTx.to,
  data: swapTx.data,
});
```

## Important Notes

- Privy handles key custody — you never see the actual Ethereum private key
- Never store Privy secrets in client-side code
- Use `@privy-io/node/viem` for seamless viem integration on Celo
- `createViemAccount` requires both `walletId` and `address`
- Application wallets don't require a Privy user account
- 50K free signatures/month, $0.01/signature after
