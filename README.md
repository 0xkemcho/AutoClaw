<h1 align="center">AutoClaw</h1>

<p align="center">
  <strong>Autonomous FX trading agents on Celo</strong> — AI analyzes news, executes stablecoin swaps.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#stack">Stack</a> •
  <a href="#environment">Environment</a>
</p>

---

## What is AutoClaw?

AutoClaw is an **autonomous FX trading agent framework** built on the Celo blockchain. It runs scheduled agents that:

- **Fetch FX news** via Parallel AI (cached per currency set)
- **Analyze with Gemini 2.5 Flash** — buy / sell / hold signals with 0–100 confidence
- **Execute swaps** through the Mento protocol (15+ stablecoin pairs: USDm, EURm, BRLm, JPYm, …)

Users connect with **Sign-In With Ethereum** (SIWE), complete a risk questionnaire, and configure guardrails. A real-time dashboard streams agent progress over WebSocket as runs execute.

---

## Quick Start

```bash
# Prerequisites: Node 20, pnpm 9.15.0
nvm use
pnpm install

# Set up environment (see Environment section)
cp apps/api/.env.example apps/api/.env

# Run everything (API :4000, Web :3000)
pnpm dev
```

| Command | Description |
|--------|-------------|
| `pnpm dev` | Run API + Web via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm type-check` | Type-check workspace |
| `pnpm test` | Run all tests |
| `pnpm clean` | Remove build output |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Agent Cron (every 60s)                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Fetch positions & portfolio value                                   │
│  2. Fetch FX news (Parallel AI)                                         │
│  3. Generate signals (Gemini LLM)                                       │
│  4. Validate vs guardrails → Execute swap (Mento, gasless EIP-7702)     │
│  5. Log to agent_timeline, emit progress events                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Progress flow:** `fetching_news` → `analyzing` → `checking_signals` → `executing_trades` → `complete` / `error`

---

## Stack

| Layer | Tech |
|-------|------|
| **API** | Fastify v5, WebSocket, Supabase, thirdweb (auth + server wallets) |
| **Web** | Next.js 15, React 19, Tailwind v4, shadcn/ui, TanStack Query, Motion |
| **Contracts** | Mento Broker, BiPoolManager, multi-hop routing via USDm hub |
| **AI** | Parallel AI (news), Gemini 2.5 Flash (signals) |

---

## Monorepo Structure

```
├── apps/
│   ├── api/          # Fastify backend (API, crons, WebSocket)
│   └── web/          # Next.js frontend (App Router, dashboard)
├── packages/
│   ├── shared/       # Types (agent config, risk, tokens, progress)
│   ├── db/           # Supabase client + generated types
│   ├── contracts/    # ABIs, routing, quote/swap builders
│   └── typescript-config/
├── supabase/         # Migrations
└── docs/             # Audit reports, plans
```

---

## Environment

**API** (`apps/api/.env`):

| Variable | Description |
|----------|-------------|
| `THIRDWEB_SECRET_KEY` | thirdweb auth |
| `THIRDWEB_ADMIN_PRIVATE_KEY` | Server wallet management |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `PARALLEL_API_KEY` | FX news search |
| `DUNE_SIM_API_KEY` | Portfolio balances |
| `CELO_RPC_URL` | Default: `https://forno.celo.org` |
| `CORS_ORIGIN` | Default: `http://localhost:3000` |

**Web** (`apps/web/.env.local`):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | thirdweb client |
| `NEXT_PUBLIC_API_URL` | Default: `http://localhost:4000` |

---

## Guardrails

Configurable per risk profile:

- Allowed / blocked currencies
- Daily trade limit
- Max trade size (USD)
- Max allocation % (buys only)

---

## Token Universe

**Mento stablecoins:** USDm, EURm, BRLm, KESm, PHPm, COPm, XOFm, NGNm, JPYm, CHFm, ZARm, GBPm, AUDm, CADm, GHSm  

**Base:** USDC, USDT  
**Commodity:** XAUT  

---

## License

Private — see repository settings.
