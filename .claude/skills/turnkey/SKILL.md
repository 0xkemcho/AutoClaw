---
name: turnkey
description: 'Turnkey SDK for server-side wallet creation and signing. Use when working with Turnkey wallets, server-side transaction signing, custodial wallets, or automated trading wallets. Triggers on: "turnkey", "server wallet", "custodial wallet", "turnkey signing", "automated wallet", "@turnkey/viem".'
---

## Overview

Turnkey provides server-side wallet management for AutoClaw. Use it for:
- Creating wallets for users on the server (no private key exposure)
- Signing transactions server-side for automated trading
- Integration with viem via `@turnkey/viem`

## Installation

```bash
pnpm add @turnkey/sdk-server @turnkey/viem
```

## Authentication

Turnkey uses P-256 API key pairs (not secp256k1). Generate via Turnkey dashboard.

```ts
import { Turnkey } from '@turnkey/sdk-server';

const turnkey = new Turnkey({
  apiBaseUrl: 'https://api.turnkey.com',
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
```

## Wallet Creation

```ts
const apiClient = turnkey.apiClient();

// Create a new wallet
const wallet = await apiClient.createWallet({
  walletName: `user-${userId}`,
  accounts: [
    {
      curve: 'CURVE_SECP256K1',
      pathFormat: 'PATH_FORMAT_BIP32',
      path: "m/44'/60'/0'/0/0",
    },
  ],
});

const walletAddress = wallet.addresses[0];
```

## Signing with Viem

```ts
import { createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { createAccount } from '@turnkey/viem';

const turnkeyAccount = await createAccount({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: walletAddress, // The Turnkey wallet address
});

const walletClient = createWalletClient({
  account: turnkeyAccount,
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
| `TURNKEY_API_PUBLIC_KEY` | P-256 public key from Turnkey dashboard |
| `TURNKEY_API_PRIVATE_KEY` | P-256 private key from Turnkey dashboard |
| `TURNKEY_ORGANIZATION_ID` | Your Turnkey org ID |

## Integration with Mento Swaps

For automated trading, combine Turnkey signing with Mento swap transactions:

```ts
import { buildSwapInTx } from '@autoclaw/contracts';

const swapTx = buildSwapInTx({ route, tokenIn, tokenOut, amountIn, amountOutMin });

const hash = await walletClient.sendTransaction({
  to: swapTx.to,
  data: swapTx.data,
});
```

## Important Notes

- Turnkey API keys are P-256 (not Ethereum secp256k1) — don't confuse them
- Never store Turnkey private keys in client-side code
- Turnkey handles key management — you never see the actual Ethereum private key
- Use `@turnkey/viem` for seamless viem integration on Celo
