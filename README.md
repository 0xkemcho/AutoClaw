<h1 align="center">AutoClaw</h1>

<p align="center">
  <strong>Autonomous AI agent platform on Celo</strong> — deploy agents that trade FX, farm yield, and analyze markets while you sleep.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#agents">Agents</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#stack">Stack</a> •
  <a href="#environment">Environment</a>
</p>

---

## What is AutoClaw?

AutoClaw is an **autonomous multi-agent platform** built on the Celo blockchain. Users connect with a wallet or social login (Google, Apple, X) — no KYC, no friction — configure their agents, and let them run.

**Agents available:**

- **FX Trading Agent** — monitors live news, generates AI signals (buy/sell/hold), executes stablecoin swaps on Mento Protocol. Gasless. Non-custodial.
- **Yield Agent** — scans ICHI vaults, Uniswap, and Merkl for best on-chain returns, deploys idle stablecoins, claims rewards, and auto-compounds continuously.
- **Intelligence Agent (Chat)** — conversational layer with live access to prices, FX news, X sentiment, and Celo governance data. Ask it anything about your portfolio or the market.

Every agent runs under user-defined **guardrails** — trade size limits, APR thresholds, allocation caps, hold periods. Every action is logged on-chain and auditable. Every AutoClaw agent is registered via **ERC-8004** (on-chain agent identity). With **SelfClaw** integration, agents carry cryptographic human-backed verification — ZK passport proof, published on-chain.

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

## Agents

### FX Trading Agent

Runs on a 60s cron. For each active agent:

1. Fetch current positions and portfolio value
2. Fetch FX news via Parallel AI (cached 1hr per currency set)
3. Generate signals with Gemini 2.5 Flash — buy/sell/hold with confidence 0–100
4. Validate against guardrails (allowed currencies, daily limit, max trade size, max allocation)
5. Execute swap via Mento Broker → thirdweb server wallet (gasless EIP-7702)
6. Log all events to `agent_timeline`, emit real-time progress via WebSocket

**Progress flow:** `fetching_news` → `analyzing` → `checking_signals` → `executing_trades` → `complete` / `error`

**FX Guardrails:** allowed/blocked currencies · daily trade limit · max trade size (USD) · max allocation % (buys only)

### Yield Agent

Continuously scans for yield opportunities across:

- **ICHI vaults** — concentrated liquidity yield
- **Uniswap** — LP positions
- **Merkl** — reward distribution campaigns

Deploys idle stablecoins into the best available vaults, claims accrued rewards, and auto-compounds. Every deposit, reward claim, and rebalance is logged to the timeline.

**Yield Guardrails:** minimum APR threshold · maximum vault allocation % · minimum hold period

### Intelligence Agent (Chat)

Conversational AI layer with access to live tool groups:

- **CoinGecko** — live token prices and market data
- **Parallel AI** — real-time FX news
- **Grok** — X (Twitter) social sentiment
- **Firecrawl** — Celo governance data

Ask it why your agent sold EURm, where yield is highest right now, or what's moving the market.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  FX Agent Cron (every 60s)                                           │
├──────────────────────────────────────────────────────────────────────┤
│  1. Fetch positions & portfolio value                                │
│  2. Fetch FX news (Parallel AI, cached 1hr)                         │
│  3. Generate signals (Gemini 2.5 Flash)                             │
│  4. Validate vs guardrails → Execute swap (Mento, gasless EIP-7702) │
│  5. Log to agent_timeline, emit progress events                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Yield Agent                                                         │
├──────────────────────────────────────────────────────────────────────┤
│  Scan ICHI / Uniswap / Merkl → Deploy stables → Claim → Compound    │
│  Guardrails: min APR · max allocation · min hold period             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Intelligence Agent (Chat)                                           │
├──────────────────────────────────────────────────────────────────────┤
│  CoinGecko prices · Parallel AI news · Grok sentiment · Firecrawl   │
└──────────────────────────────────────────────────────────────────────┘
```

**Real-time progress:** Node.js EventEmitter → WebSocket at `/api/ws`. Frontend `useAgentProgress()` hook streams live updates to the dashboard.

**Trade routing:** All swaps route through USDm as the hub token. Multi-hop routing via Mento BiPoolManager. Default slippage 0.5%.

**On-chain identity:** Each agent is registered via ERC-8004 — a verifiable on-chain identity with a transparent, auditable track record. Not a black box.

**Human verification:** SelfClaw integration provides ZK passport proof (Self.xyz, NFC chip, 180+ countries), published on-chain via ERC-8004. Agents carry cryptographic proof of human backing.

---

## Stack

| Layer | Tech |
|-------|------|
| **API** | Fastify v5, WebSocket, Supabase, thirdweb (auth + server wallets) |
| **Web** | Next.js 15, React 19, Tailwind v4, shadcn/ui, TanStack Query, Motion |
| **Auth** | thirdweb SIWE + social login (Google, Apple, X) — no KYC |
| **Contracts** | Mento Broker, BiPoolManager, multi-hop routing via USDm hub |
| **FX AI** | Parallel AI (news), Gemini 2.5 Flash (signals) |
| **Yield** | ICHI vaults, Uniswap LP, Merkl reward campaigns |
| **Chat AI** | CoinGecko (prices), Parallel AI (news), Grok (sentiment), Firecrawl (governance) |
| **Identity** | ERC-8004 (on-chain agent registry), SelfClaw (ZK human verification) |
| **Gas** | EIP-7702 gasless transactions via thirdweb |

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
└── docs/             # Audit reports, plans, product video scripts
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

## Token Universe

**Mento stablecoins:** USDm, EURm, BRLm, KESm, PHPm, COPm, XOFm, NGNm, JPYm, CHFm, ZARm, GBPm, AUDm, CADm, GHSm

**Base:** USDC, USDT
**Commodity:** XAUT

---

## License

Private — see repository settings.
