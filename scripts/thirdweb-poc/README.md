# Thirdweb Server Wallet + Gasless PoC on Celo

Proof-of-concept to validate replacing Privy with thirdweb for server wallets and gasless (sponsored) transactions on Celo.

## Prerequisites

- **THIRDWEB_SECRET_KEY** in `apps/api/.env` (or project root `.env`)
- **Thirdweb plan** with Gas Sponsorship and Server Wallets enabled (Starter $5/mo minimum)
- **Test funds**: A wallet with ~5–10 USDC on Celo mainnet to fund the server wallet
- **FUNDER_PRIVATE_KEY** (optional): Hex private key for auto-funding in script 02

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `THIRDWEB_SECRET_KEY` | Yes | From thirdweb dashboard |
| `CELO_RPC_URL` | No | Default: https://forno.celo.org |
| `FUNDER_PRIVATE_KEY` | No | Auto-fund server wallet with 5 USDC in script 02 |

## Execution Order

Run from `apps/api` (uses its .env and dependencies):

```bash
cd apps/api

# 1. Create server wallet
pnpm tsx ../../scripts/thirdweb-poc/01-create-wallet.ts

# 2. Fund the server wallet (manual or auto)
# If FUNDER_PRIVATE_KEY is set:
pnpm tsx ../../scripts/thirdweb-poc/02-fund-wallet.ts

# If not: Send 5+ USDC to the printed address on Celo, then run:
pnpm tsx ../../scripts/thirdweb-poc/02-fund-wallet.ts

# 3. Execute sponsored approve + swap
pnpm tsx ../../scripts/thirdweb-poc/03-sponsored-swap.ts 1
# Optional: pass amount in USDC (default 1)
```

## Expected Output

### 01-create-wallet.ts
```
Server wallet created successfully!
Address: 0x...
```

### 02-fund-wallet.ts
```
Server wallet: 0x...
Balance: 5.000000 USDC (sufficient)
```

### 03-sponsored-swap.ts
```
Swap: 1 USDC → USDm (gas sponsored by thirdweb)
Transaction IDs: ...
✓ Swap successful! Gas was sponsored by thirdweb.
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `THIRDWEB_SECRET_KEY is required` | Set in `apps/api/.env` or project root `.env` |
| `State file not found` | Run 01-create-wallet.ts first |
| `insufficient funds` | Fund the server wallet with 5+ USDC |
| `createServerWallet failed (401)` | Check THIRDWEB_SECRET_KEY is valid |
| `createServerWallet failed (402)` | Upgrade thirdweb plan or enable Server Wallets |
| `sendTransaction failed` | Verify Celo (42220) is enabled for Gas Sponsorship in thirdweb dashboard |
| `No route found` | Mento routing issue; ensure USDC/USDm addresses are correct |

## File Structure

```
scripts/thirdweb-poc/
├── config.ts
├── lib/thirdweb-api.ts
├── state.json          # Created by 01, gitignored
├── 01-create-wallet.ts
├── 02-fund-wallet.ts
├── 03-sponsored-swap.ts
└── README.md
```

## Success Criteria

- All 3 scripts complete without error
- Gas is sponsored (no CELO/USDC deducted from server wallet for fees)
- Swap executes correctly (USDC decreased, USDm increased)

**Go/No-Go:** If all criteria pass, proceed with full Privy → thirdweb migration. Otherwise, document blockers and consider fallback (gas top-up).
